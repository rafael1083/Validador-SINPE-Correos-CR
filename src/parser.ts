import { SinpeTransaction } from './csv-handler';

function toProperName(raw: string): string {
    return raw
        .replace(/[_\-]+/g, ' ')
        .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeMonto(raw: string): string {
    let clean = raw.trim().replace(/\s/g, '');
    if (clean.includes('.') && clean.includes(',')) {
        const lastCommaIdx = clean.lastIndexOf(',');
        const lastDotIdx = clean.lastIndexOf('.');
        if (lastCommaIdx > lastDotIdx) {
            clean = clean.replace(/\./g, '').replace(/,/g, '.');
        } else {
            clean = clean.replace(/,/g, '').replace(/\./g, '.');
        }
    } else if (clean.includes(',')) {
        const parts = clean.split(',');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
            clean = clean.replace(/,/g, '');
        } else {
            clean = clean.replace(/,/g, '.');
        }
    }
    return clean;
}

export function parseSinpeEmail(body: string, emailDate: Date, project: 'Etelgive' | 'Multichunches'): SinpeTransaction | null {
    try {
        const clean = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

        if (project === 'Multichunches') {
            // Requerir estrictamente "BN SINPE MOVIL" en el cuerpo
            if (!clean.includes('BN SINPE MOVIL')) {
                return null;
            }

            // Formato 1 (SINPE MOVIL BN): Ha recibido 2700 colones por BN SINPE MOVIL de ALVAREZ BUSTOS MARIA. Varios. Referencia 123
            const bnMonto = clean.match(/Ha\s+recibido\s+(?:¢|colones|colS)?\s*([\d,\.]+)\s*(?:colones|colS)?\s+por\s+BN\s+SINPE\s+MOVIL/i);
            
            const bnRef = clean.match(/Referencia\s+(\d+)/i);
            const bnNombreMatch = clean.match(/de\s+([^.]+)/i);
            
            // Concepto: después del nombre y antes de la referencia
            const conceptoMatch = clean.match(/de\s+[^.]+\.\s+([^.]+?)\.\s+Referencia/i) 
                                 || clean.match(/por\s+BN\s+SINPE\s+MOVIL\s+de\s+[^.]+\.\s+([^.]+?)\.\s+Referencia/i);

            if (bnRef && bnMonto) {
                let cleanMonto = bnMonto[1].trim().replace(/\s/g, '');
                cleanMonto = normalizeMonto(cleanMonto);
                
                const nombre = bnNombreMatch ? bnNombreMatch[1].trim() : 'Desconocido';
                const concepto = conceptoMatch ? conceptoMatch[1].trim() : 'SINPE Multichunches';

                return {
                    fecha: emailDate.toISOString(),
                    referencia: bnRef[1],
                    telefonoOrigen: '0',
                    nombreOrigen: toProperName(nombre),
                    entidadOrigen: 'Banco Nacional',
                    monto: cleanMonto,
                    motivo: concepto,
                    proyecto: project,
                    estado: 'Notificación BN'
                };
            }
        } else {
            // BCR: Número de referencia: 123
            // Solo procesar acreditaciones, omitir débitos
            const isAcreditacion = /se le ha acreditado/i.test(clean);
            const isDebito = /se le ha debitado/i.test(clean);

            if (isDebito && !isAcreditacion) {
                return null;
            }

            const bcrRef = clean.match(/Número de referencia:\s*(\d+)/);
            const bcrTelefono = clean.match(/Teléfono\s+(?:Destino|origen):\s*(\d+)/i);
            const bcrNombre = clean.match(/Nombre cliente\s+(?:Destino|origen):\s*([^\n]+)/i);
            const bcrEntidad = clean.match(/Entidad\s+(?:Destino|origen):\s*([^\n]+)/i);
            const bcrMonto = clean.match(/Monto:\s*([\d,.\s]+?)(?:\n|$)/i);
            const bcrMotivo = clean.match(/Motivo:\s*([^\n]+)/i);

            if (bcrRef) {
                let cleanMonto = bcrMonto ? bcrMonto[1].trim().replace(/\s/g, '') : '0';
                cleanMonto = normalizeMonto(cleanMonto);

                return {
                    fecha: emailDate.toISOString(),
                    referencia: bcrRef[1],
                    telefonoOrigen: bcrTelefono ? bcrTelefono[1] : '0',
                    nombreOrigen: bcrNombre ? toProperName(bcrNombre[1]) : 'Desconocido',
                    entidadOrigen: bcrEntidad ? bcrEntidad[1].trim() : 'BCR',
                    monto: cleanMonto,
                    motivo: bcrMotivo ? bcrMotivo[1].trim() : 'SINPE BCR',
                    proyecto: project,
                    estado: 'SINPEMOVIL - Notificación de transacción realizada'
                };
            }
        }

        return null;
    } catch (error) {
        console.error(`[PARSER][${project}] Error:`, error);
        return null;
    }
}
