import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { loadConfig, EmailAccount } from './config';
import { parseSinpeEmail } from './parser';
import { saveTransaction, getAllTransactions, syncAndCreateCSV } from './csv-handler';
import logger from './logger';

const config = loadConfig();
const app = express();
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer);
let watchers: any[] = [];

app.use(express.static(path.join(__dirname, '../public')));
app.use('/logos', express.static(path.join(__dirname, '../logos')));

app.get('/api/formats', (req, res) => {
    try {
        const etelgivePath = path.join(__dirname, '../data/format_etelgive.txt');
        const multichunchesPath = path.join(__dirname, '../data/format_multichunches.txt');
        
        const etelgive = fs.existsSync(etelgivePath) ? fs.readFileSync(etelgivePath, 'utf8') : '';
        const multichunches = fs.existsSync(multichunchesPath) ? fs.readFileSync(multichunchesPath, 'utf8') : '';
        
        res.json({ Etelgive: etelgive, Multichunches: multichunches });
    } catch (error) {
        res.status(500).json({ error: 'Error al leer formatos' });
    }
});

app.post('/api/formats/:project', (req, res) => {
    try {
        const project = req.params.project.toLowerCase();
        const content = req.body.content;
        const filePath = path.join(__dirname, `../data/format_${project}.txt`);
        
        fs.writeFileSync(filePath, content);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar formato' });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
        const project = req.query.project as string;
        const transactions = await getAllTransactions(project);
        res.json(transactions);
    } catch (error) {
        logger.error('Error al obtener transacciones:', error);
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
});

app.get('/api/transactions/week', async (req, res) => {
    try {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const project = req.query.project as string;
        const transactions = await getAllTransactions(project);

        const weekTransactions = transactions.filter(t => {
            const txDate = new Date(t.fecha);
            return txDate >= startOfWeek;
        });

        res.json(weekTransactions);
    } catch (error) {
        logger.error('Error al obtener transacciones de la semana:', error);
        res.status(500).json({ error: 'Error al obtener transacciones de la semana' });
    }
});

app.get('/api/transactions/week/csv', async (req, res) => {
    try {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const project = req.query.project as string;
        const transactions = await getAllTransactions(project);

        const weekTransactions = transactions.filter(t => {
            const txDate = new Date(t.fecha);
            return txDate >= startOfWeek;
        });

        const header = 'FECHA,NUMERO_REFERENCIA,TELEFONO_ORIGEN,NOMBRE_CLIENTE_ORIGEN,ENTIDAD_ORIGEN,MONTO,MOTIVO,PROYECTO\n';
        const rows = weekTransactions.map(t =>
            `${t.fecha},${t.referencia},${t.telefonoOrigen},${t.nombreOrigen},${t.entidadOrigen},${t.monto},${t.motivo},${t.proyecto}`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="transacciones_semana_${today.toISOString().split('T')[0]}.csv"`);
        res.send(header + rows);
    } catch (error) {
        logger.error('Error al descargar CSV semanal:', error);
        res.status(500).json({ error: 'Error al descargar CSV' });
    }
});

app.get('/api/transactions/month', async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        const project = req.query.project as string;
        const transactions = await getAllTransactions(project);

        const monthTransactions = transactions.filter(t => {
            const txDate = new Date(t.fecha);
            return txDate >= startOfMonth;
        });

        res.json(monthTransactions);
    } catch (error) {
        logger.error('Error al obtener transacciones del mes:', error);
        res.status(500).json({ error: 'Error al obtener transacciones del mes' });
    }
});

app.get('/api/transactions/month/csv', async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        const project = req.query.project as string;
        const transactions = await getAllTransactions(project);

        const monthTransactions = transactions.filter(t => {
            const txDate = new Date(t.fecha);
            return txDate >= startOfMonth;
        });

        const deduped = Array.from(new Map(monthTransactions.map(t => [t.referencia, t])).values());

        const header = 'FECHA,NUMERO_REFERENCIA,TELEFONO_ORIGEN,NOMBRE_CLIENTE_ORIGEN,ENTIDAD_ORIGEN,MONTO,MOTIVO,PROYECTO,ESTADO\n';
        const rows = deduped.map(t =>
            `${t.fecha},${t.referencia},${t.telefonoOrigen},${t.nombreOrigen},${t.entidadOrigen},${t.monto},${t.motivo},${t.proyecto},${t.estado}`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="transacciones_mes_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}.csv"`);
        res.send(header + rows);
    } catch (error) {
        logger.error('Error al descargar CSV mensual:', error);
        res.status(500).json({ error: 'Error al descargar CSV' });
    }
});

app.post('/api/test/create-sinpe', async (req, res) => {
    try {
        const testTx = {
            fecha: new Date().toISOString(),
            referencia: `TEST${Date.now()}`,
            telefonoOrigen: '8888-8888',
            nombreOrigen: 'Test Usuario QA',
            entidadOrigen: 'Banco Nacional',
            monto: '1234.56',
            motivo: 'Prueba QA - Será eliminada',
            proyecto: 'Multichunches',
            estado: 'Notificación BN - TEST'
        };

        const saved = await saveTransaction(testTx, 'Multichunches');
        if (saved) {
            logger.info(`[TEST] SINPE ficticio creado: ${testTx.referencia}`);
            io.emit('new-transaction', testTx);
            res.json({ success: true, referencia: testTx.referencia, transaction: testTx });
        } else {
            res.status(500).json({ error: 'No se pudo guardar' });
        }
    } catch (error: any) {
        logger.error('[TEST] Error al crear SINPE ficticio:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/test/create-sinpe-etelgive', async (req, res) => {
    try {
        const testTx = {
            fecha: new Date().toISOString(),
            referencia: `ETG${Date.now()}`,
            telefonoOrigen: '8765-4321',
            nombreOrigen: 'Test BCR Usuario',
            entidadOrigen: 'Banco Nacional de Costa Rica',
            monto: '5678.90',
            motivo: 'Prueba Etelgive QA',
            proyecto: 'Etelgive',
            estado: 'SINPEMOVIL - Notificación de transacción realizada - TEST'
        };

        const saved = await saveTransaction(testTx, 'Etelgive');
        if (saved) {
            logger.info(`[TEST] SINPE Etelgive ficticio creado: ${testTx.referencia}`);
            io.emit('new-transaction', testTx);
            res.json({ success: true, referencia: testTx.referencia, transaction: testTx });
        } else {
            res.status(500).json({ error: 'No se pudo guardar' });
        }
    } catch (error: any) {
        logger.error('[TEST] Error al crear SINPE Etelgive ficticio:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/test/delete-sinpe/:referencia', async (req, res) => {
    try {
        const ref = req.params.referencia;
        const allTx = await getAllTransactions();

        // Filtrar transacciones excluyendo la de referencia
        const filtered = allTx.filter(t => t.referencia !== ref);

        if (filtered.length === allTx.length) {
            return res.status(404).json({ error: `Referencia ${ref} no encontrada` });
        }

        // Reescribir CSVs sin el registro
        const projects = ['Etelgive', 'Multichunches'];
        for (const project of projects) {
            const txForProject = filtered.filter(t => t.proyecto === project);
            const csvPath = `./data/sinpes_${project.toLowerCase()}.csv`;
            const header = 'FECHA,NUMERO_REFERENCIA,TELEFONO_ORIGEN,NOMBRE_CLIENTE_ORIGEN,ENTIDAD_ORIGEN,MONTO,MOTIVO,PROYECTO,ESTADO\n';
            const rows = txForProject.map(t => {
                const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
                return `${escape(t.fecha)},${escape(t.referencia)},${escape(t.telefonoOrigen)},${escape(t.nombreOrigen)},${escape(t.entidadOrigen)},${escape(t.monto)},${escape(t.motivo)},${escape(t.proyecto)},${escape(t.estado)}`;
            }).join('\n');

            const fs = require('fs');
            fs.writeFileSync(csvPath, header + rows + '\n');
        }

        logger.info(`[TEST] SINPE eliminado: ${ref}`);
        res.json({ success: true, message: `Referencia ${ref} eliminada`, remaining: filtered.length });
    } catch (error: any) {
        logger.error('[TEST] Error al eliminar SINPE:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sync-csv', async (req, res) => {
    try {
        logger.info('[SYNC] Iniciando sincronización de CSV...');
        await syncAndCreateCSV();
        let allTransactions = await getAllTransactions();
        logger.info(`[SYNC] Total transacciones después sync: ${allTransactions.length}`);

        // Si CSV están vacíos, rescanear correos del mes actual
        if (allTransactions.length === 0) {
            logger.info('[SYNC] CSV vacíos. Rescanear correos del mes actual...');
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Rescanear con watchers existentes
            if (watchers && watchers.length >= 2) {
                for (const watcher of watchers) {
                    try {
                        await (watcher as any).scanRescan(startOfMonth);
                    } catch (err) {
                        logger.error(`[SYNC] Error escaneando ${(watcher as any).account.project}:`, err);
                    }
                }
            }

            allTransactions = await getAllTransactions();
            logger.info(`[SYNC] Total transacciones después rescan: ${allTransactions.length}`);
        }

        res.json({ success: true, count: allTransactions.length, message: 'CSV sincronizado y recuperado si estaba vacío' });
    } catch (error: any) {
        logger.error('[SYNC] Error crítico:', error);
        res.status(500).json({ error: 'Error al sincronizar: ' + error.message });
    }
});

class SinpeWatcher {
    private client: ImapFlow;
    public account: EmailAccount;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private isReconnecting: boolean = false;

    constructor(account: EmailAccount) {
        this.account = account;
        this.client = this.createClient();
    }

    private createClient() {
        return new ImapFlow({
            host: 'imap.gmail.com',
            port: this.account.port,
            secure: true,
            auth: { user: this.account.user, pass: this.account.pass },
            logger: false,
            greetingTimeout: 30000,
            connectionTimeout: 30000
        });
    }

    async start() {
        if (this.isReconnecting) return;
        
        try {
            this.stopHeartbeat();
            try { await this.client.logout(); } catch (e) {}
            
            this.client = this.createClient();
            this.setupEventHandlers();

            await this.client.connect();
            logger.info(`[IMAP][${this.account.project}] Conectado exitosamente.`);
            
            await this.scanRecent();
            await this.setupIdle();
            this.startHeartbeat();
        } catch (error: any) {
            logger.error(`[ERROR][${this.account.project}] Fallo de conexión:`, error?.message || error);
            this.scheduleReconnect();
        }
    }

    private setupEventHandlers() {
        this.client.on('exists', async (data) => {
            logger.info(`[IMAP][${this.account.project}] Nuevo correo detectado. Total: ${data.count}`);
            await this.fetchAndProcessLatest(data.count);
        });

        this.client.on('error', (err) => {
            logger.error(`[ERROR][${this.account.project}] Error en socket: ${err.message}`);
            this.scheduleReconnect();
        });

        this.client.on('close', () => {
            logger.warn(`[IMAP][${this.account.project}] Conexión cerrada.`);
            this.scheduleReconnect();
        });
    }

    private async fetchAndProcessLatest(count: number) {
        try {
            let lock = await this.client.getMailboxLock('INBOX');
            try {
                const message = await this.client.fetchOne(`${count}`, { source: true, envelope: true });
                if (message && message.source) {
                    logger.info(`[IMAP][${this.account.project}] Procesando correo ${count}...`);
                    await this.processMessage(message.source);
                }
            } finally {
                lock.release();
            }
        } catch (err) {
            logger.error(`[ERROR][${this.account.project}] Error procesando nuevo correo:`, err);
        }
    }

    private async setupIdle() {
        try {
            this.client.idle().catch(err => {
                logger.error(`[IMAP][${this.account.project}] Error en IDLE: ${err.message}`);
                this.scheduleReconnect();
            });
            logger.info(`[IMAP][${this.account.project}] IDLE activo.`);
        } catch (err: any) {
            logger.error(`[IMAP][${this.account.project}] No se pudo iniciar IDLE: ${err.message}`);
            this.scheduleReconnect();
        }
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(async () => {
            try {
                // Timeout de 30s para el NOOP para evitar quedar en modo zombie
                const noopPromise = this.client.noop();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout en NOOP')), 30000)
                );

                await Promise.race([noopPromise, timeoutPromise]);
                logger.debug(`[IMAP][${this.account.project}] Heartbeat OK`);
            } catch (err: any) {
                logger.error(`[IMAP][${this.account.project}] Heartbeat falló: ${err.message}. Reconectando...`);
                this.scheduleReconnect();
            }
        }, 5 * 60 * 1000); // Cada 5 minutos
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private scheduleReconnect() {
        if (this.isReconnecting) return;
        this.isReconnecting = true;
        this.stopHeartbeat();
        
        logger.info(`[IMAP][${this.account.project}] Reconectando en 30s...`);
        setTimeout(async () => {
            this.isReconnecting = false;
            await this.start();
        }, 30000);
    }

    private async scanRecent() {
        logger.info(`[IMAP][${this.account.project}] Escaneando correos recientes...`);
        const startOfMonth = new Date();
        startOfMonth.setDate(1);

        let lock = await this.client.getMailboxLock('INBOX');
        try {
            let searchCriteria: any;
            if (this.account.project === 'Etelgive') {
                searchCriteria = { subject: 'SINPEMOVIL', since: startOfMonth };
            } else {
                searchCriteria = {
                    or: [
                        { body: 'BN SINPE MOVIL' },
                        { body: 'BN informa' }
                    ],
                    since: startOfMonth
                };
            }

            const messages = await this.client.search(searchCriteria);

            if (!messages || messages.length === 0) {
                return;
            }

            logger.info(`[IMAP][${this.account.project}] Se encontraron ${messages.length} correos para procesar.`);

            for (const seq of messages) {
                const message = await this.client.fetchOne(seq.toString(), { source: true });
                if (message && message.source) {
                    await this.processMessage(message.source);
                }
            }
        } finally {
            lock.release();
        }
    }

    private async processMessage(source: Buffer) {
        const parsed = await simpleParser(source);
        const body = (parsed.text || parsed.textAsHtml || '').toString();
        const date = parsed.date || new Date();
        const project = this.account.project as 'Etelgive' | 'Multichunches';

        const transaction = parseSinpeEmail(body, date, project);
        if (transaction) {
            const saved = await saveTransaction(transaction, project);
            if (saved) {
                logger.info(`[SUCCESS][${project}] Transacción guardada: ${transaction.referencia}`);
                const eventData = { ...transaction, proyecto: project };
                io.emit('new-transaction', eventData);
            }
        }
    }

    async scanRescan(startDate: Date) {
        logger.info(`[RESCAN][${this.account.project}] Escaneando correos desde ${startDate.toLocaleDateString()}...`);
        let lock = await this.client.getMailboxLock('INBOX');
        try {
            let searchCriteria: any;
            if (this.account.project === 'Etelgive') {
                searchCriteria = { subject: 'SINPEMOVIL', since: startDate };
            } else {
                searchCriteria = {
                    or: [
                        { body: 'BN SINPE MOVIL' },
                        { body: 'BN informa' }
                    ],
                    since: startDate
                };
            }

            const messages = await this.client.search(searchCriteria);

            if (!messages || messages.length === 0) {
                return;
            }

            for (const seq of messages) {
                const message = await this.client.fetchOne(seq.toString(), { source: true });
                if (message && message.source) {
                    await this.processMessage(message.source);
                }
            }
        } finally {
            lock.release();
        }
    }

    async stop() {
        this.stopHeartbeat();
        try { await this.client.logout(); } catch (e) {}
    }
}

// Manejo de excepciones no controladas para evitar procesos zombie
process.on('uncaughtException', async (err) => {
    logger.error('EXCEPCIÓN NO CONTROLADA (Fatal)', { error: err.message, stack: err.stack });
    for (const w of watchers) {
        try { await w.stop(); } catch (e) {}
    }
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('RECHAZO DE PROMESA NO CONTROLADO', { reason: String(reason) });
});

async function main() {
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
        logger.info(`[SISTEMA] Servidor listo en puerto ${PORT}`);
    });

    watchers = config.accounts.map(acc => new SinpeWatcher(acc));
    for (const watcher of watchers) {
        watcher.start();
    }

    const shutdown = async () => {
        logger.info('[SISTEMA] Cerrando servicios...');
        for (const w of watchers) await w.stop();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch(err => {
    logger.error('[FATAL] Error en el proceso principal:', err);
    process.exit(1);
});

