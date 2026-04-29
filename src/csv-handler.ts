import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import logger from './logger';

export interface SinpeTransaction {
    fecha: string;
    referencia: string;
    telefonoOrigen: string;
    nombreOrigen: string;
    entidadOrigen: string;
    monto: string;
    motivo: string;
    proyecto: string;
    estado: string;
}

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const processedByProject = new Map<string, Set<string>>();
let isWriting = false;

function getCsvPath(project: string) {
    return path.join(dataDir, `sinpes_${project.toLowerCase()}.csv`);
}

function loadProcessed(project: string) {
    const csvPath = getCsvPath(project);
    const set = new Set<string>();
    if (fs.existsSync(csvPath)) {
        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n').slice(1).filter(l => l.trim());
        lines.forEach(line => {
            const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            const cols = matches.map(m => m.replace(/^"|"$/g, '').trim());
            if (cols[1]) set.add(cols[1]);
        });
    }
    processedByProject.set(project, set);
    logger.info(`[CSV] Cargado ${project}: ${set.size} referencias`);
}

// Cargar inicial
['Etelgive', 'Multichunches'].forEach(loadProcessed);

export async function saveTransaction(tx: SinpeTransaction, project: string): Promise<boolean> {
    const id = tx.referencia.trim();
    const projectSet = processedByProject.get(project) || new Set();
    
    // Si ya existe y no es "Desconocido", omitir. 
    // Si es "Desconocido" pero la nueva tiene nombre, permitimos actualizar.
    const isNewBetter = tx.nombreOrigen !== 'Desconocido' || tx.telefonoOrigen !== '0';
    
    if (projectSet.has(id) && !isNewBetter) {
        logger.info(`[CSV][${project}] Transacción duplicada omitida: ${id}`);
        return false;
    }

    while (isWriting) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    try {
        isWriting = true;
        const csvPath = getCsvPath(project);

        // Escritura manual para consistencia
        const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
        const row = `${escape(tx.fecha)},${escape(tx.referencia)},${escape(tx.telefonoOrigen)},${escape(tx.nombreOrigen)},${escape(tx.entidadOrigen)},${escape(tx.monto)},${escape(tx.motivo)},${escape(tx.proyecto)},${escape(tx.estado)}`;

        try {
            if (!fs.existsSync(csvPath)) {
                const header = 'FECHA,NUMERO_REFERENCIA,TELEFONO_ORIGEN,NOMBRE_CLIENTE_ORIGEN,ENTIDAD_ORIGEN,MONTO,MOTIVO,PROYECTO,ESTADO\n';
                fs.writeFileSync(csvPath, header + row + '\n');
                logger.info(`[CSV][${project}] Archivo creado y transacción guardada: ${id}`);
            } else {
                fs.appendFileSync(csvPath, row + '\n');
                logger.info(`[CSV][${project}] Transacción agregada: ${id}`);
            }
        } catch (writeError: any) {
            logger.error(`[CSV][${project}] ERROR escribiendo archivo: ${writeError.message}`);
            return false;
        }

        projectSet.add(id);
        processedByProject.set(project, projectSet);
        return true;
    } finally {
        isWriting = false;
    }
}

export async function getAllTransactions(project?: string): Promise<SinpeTransaction[]> {
    const projects = project ? [project] : ['Etelgive', 'Multichunches'];
    let all: SinpeTransaction[] = [];

    // Incluir sinpes.csv (archivo general antiguo) si no se especifica proyecto o para asegurar historial
    const pathsToRead = projects.map(p => getCsvPath(p));
    if (!project) {
        pathsToRead.push(path.join(dataDir, 'sinpes.csv'));
    }

    logger.info(`[CSV] Leyendo transacciones... paths: ${pathsToRead.length}`);
    for (const csvPath of pathsToRead) {
        if (!fs.existsSync(csvPath)) {
            logger.info(`[CSV] No existe: ${csvPath}`);
            continue;
        }
        logger.info(`[CSV] Leyendo: ${csvPath}`);
        
        try {
            const content = fs.readFileSync(csvPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim() !== '');
            const dataLines = lines[0].includes('FECHA') ? lines.slice(1) : lines;

            logger.info(`[CSV] ${csvPath}: ${lines.length} líneas totales, ${dataLines.length} datos`);

            const pTransactions = dataLines.map(line => {
                const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                const parts = matches.map(m => m.replace(/^"|"$/g, '').trim());
                return {
                    fecha: parts[0] || '',
                    referencia: parts[1] || '',
                    telefonoOrigen: parts[2] || '0',
                    nombreOrigen: parts[3] || 'Desconocido',
                    entidadOrigen: parts[4] || 'Desconocido',
                    monto: parts[5] || '0',
                    motivo: parts[6] || '',
                    proyecto: parts[7] || project || '',
                    estado: parts[8] || ''
                };
            });
            all = all.concat(pTransactions);
        } catch (error) {
            logger.error(`[CSV] Error leyendo transacciones de ${csvPath}:`, error);
        }
    }
    
    // Eliminar duplicados por referencia antes de retornar
    const unique = Array.from(new Map(all.map(tx => [tx.referencia, tx])).values());
    return unique.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function syncAndCreateCSV(): Promise<void> {
    const projects = ['Etelgive', 'Multichunches'];

    // Resetear cache de processedByProject
    processedByProject.clear();

    // Leer todos los datos sin filtro de proyecto - PRIMERO antes de escribir
    const allData = await getAllTransactions();

    for (const project of projects) {
        // Filtrar datos por proyecto
        const transactions = allData.filter(t => t.proyecto === project);
        const csvPath = getCsvPath(project);

        // Escribir CSV con campos escapados correctamente
        const header = 'FECHA,NUMERO_REFERENCIA,TELEFONO_ORIGEN,NOMBRE_CLIENTE_ORIGEN,ENTIDAD_ORIGEN,MONTO,MOTIVO,PROYECTO,ESTADO\n';
        const rows = transactions.map(t => {
            const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
            return `${escape(t.fecha)},${escape(t.referencia)},${escape(t.telefonoOrigen)},${escape(t.nombreOrigen)},${escape(t.entidadOrigen)},${escape(t.monto)},${escape(t.motivo)},${escape(t.proyecto)},${escape(t.estado)}`;
        }).join('\n');

        fs.writeFileSync(csvPath, header + rows + '\n');

        // Actualizar cache después de escribir
        loadProcessed(project);
        logger.info(`[SYNC] CSV recreado: ${project} (${transactions.length} registros)`);
    }
}

