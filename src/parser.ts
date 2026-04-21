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

export function parseSinpeEmail(body: string, emailDate: Date, project: 'Etelgive' | 'Multichunches'): SinpeTransaction | null {
    try {
        const clean = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

        if (project === 'Multichunches') {
            // BN: Ha recibido 40000 colones por ... de NOMBRE. concepto. Referencia 123
            const bnMonto = clean.match(/Ha\s+recibido\s+([\d,\.]+)\s+colones/i);
            const bnRef = clean.match(/Referencia\s+(\d+)/i);
            const bnNombreMatch = clean.match(/de\s+([^.]+)/i);
            const conceptoMatch = clean.match(/de\s+[^.]+\.\s+([^.]+?)\.\s+Referencia/i);

            if (bnRef && bnMonto) {
                let cleanMonto = bnMonto[1].trim().replace(/\s/g, '');
                if (cleanMonto.includes('.') && cleanMonto.includes(',')) {
                    const lastCommaIdx = cleanMonto.lastIndexOf(',');
                    const lastDotIdx = cleanMonto.lastIndexOf('.');
                    if (lastCommaIdx > lastDotIdx) {
                        cleanMonto = cleanMonto.replace(/\./g, '').replace(/,/g, '.');
                    } else {
                        cleanMonto = cleanMonto.replace(/,/g, '').replace(/\./g, '.');
                    }
                } else if (cleanMonto.includes(',')) {
                    cleanMonto = cleanMonto.replace(/,/g, '.');
                }
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
                if (cleanMonto.includes('.') && cleanMonto.includes(',')) {
                    const lastCommaIdx = cleanMonto.lastIndexOf(',');
                    const lastDotIdx = cleanMonto.lastIndexOf('.');
                    if (lastCommaIdx > lastDotIdx) {
                        cleanMonto = cleanMonto.replace(/\./g, '').replace(/,/g, '.');
                    } else {
                        cleanMonto = cleanMonto.replace(/,/g, '').replace(/\./g, '.');
                    }
                } else if (cleanMonto.includes(',')) {
                    cleanMonto = cleanMonto.replace(/,/g, '.');
                }

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
