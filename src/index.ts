import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { loadConfig, EmailAccount } from './config';
import { parseSinpeEmail } from './parser';
import { saveTransaction, getAllTransactions, syncAndCreateCSV } from './csv-handler';

const config = loadConfig();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
let watchers: any[] = [];

app.use(express.static(path.join(__dirname, '../public')));
app.use('/logos', express.static(path.join(__dirname, '../logos')));

app.get('/api/transactions', async (req, res) => {
    try {
        const project = req.query.project as string;
        const transactions = await getAllTransactions(project);
        res.json(transactions);
    } catch (error) {
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
            console.log(`[TEST] SINPE ficticio creado: ${testTx.referencia}`);
            io.emit('new-transaction', testTx);
            res.json({ success: true, referencia: testTx.referencia, transaction: testTx });
        } else {
            res.status(500).json({ error: 'No se pudo guardar' });
        }
    } catch (error: any) {
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
            console.log(`[TEST] SINPE Etelgive ficticio creado: ${testTx.referencia}`);
            io.emit('new-transaction', testTx);
            res.json({ success: true, referencia: testTx.referencia, transaction: testTx });
        } else {
            res.status(500).json({ error: 'No se pudo guardar' });
        }
    } catch (error: any) {
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

        console.log(`[TEST] SINPE eliminado: ${ref}`);
        res.json({ success: true, message: `Referencia ${ref} eliminada`, remaining: filtered.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sync-csv', async (req, res) => {
    try {
        console.log('[SYNC] Iniciando sincronización de CSV...');
        await syncAndCreateCSV();
        let allTransactions = await getAllTransactions();
        console.log(`[SYNC] Total transacciones después sync: ${allTransactions.length}`);

        // Si CSV están vacíos, rescanear correos del mes actual
        if (allTransactions.length === 0) {
            console.log('[SYNC] CSV vacíos. Rescanear correos del mes actual...');
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Rescanear con watchers existentes
            if (watchers && watchers.length >= 2) {
                for (const watcher of watchers) {
                    try {
                        await (watcher as any).scanRescan(startOfMonth);
                    } catch (err) {
                        console.error(`[SYNC] Error escaneando ${(watcher as any).account.project}:`, err);
                    }
                }
            }

            allTransactions = await getAllTransactions();
            console.log(`[SYNC] Total transacciones después rescan: ${allTransactions.length}`);
        }

        res.json({ success: true, count: allTransactions.length, message: 'CSV sincronizado y recuperado si estaba vacío' });
    } catch (error: any) {
        console.error('[SYNC] Error:', error);
        res.status(500).json({ error: 'Error al sincronizar: ' + error.message });
    }
});

class SinpeWatcher {
    private client: ImapFlow;
    private account: EmailAccount;

    constructor(account: EmailAccount) {
        this.account = account;
        this.client = new ImapFlow({
            host: 'imap.gmail.com',
            port: account.port,
            secure: true,
            auth: { user: account.user, pass: account.pass },
            logger: false
        });
    }

    async start() {
        try {
            // Recrear cliente para evitar reutilización de instancia cerrada
            this.client = new ImapFlow({
                host: 'imap.gmail.com',
                port: this.account.port,
                secure: true,
                auth: { user: this.account.user, pass: this.account.pass },
                logger: false
            });

            await this.client.connect();
            console.log(`[IMAP][${this.account.project}] Conectado exitosamente.`);
            await this.scanRecent();
            this.setupIdle();
        } catch (error: any) {
            console.error(`[ERROR][${this.account.project}] Fallo de conexión:`, error?.message || error);
            setTimeout(() => this.start(), 30000);
        }
    }

    private async setupIdle() {
        console.log(`[IMAP][${this.account.project}] IDLE listener registrado.`);
        this.client.on('exists', async (data) => {
            console.log(`[IMAP][${this.account.project}] Nuevo correo detectado. Total: ${data.count}`);
            try {
                let lock = await this.client.getMailboxLock('INBOX');
                try {
                    const message = await this.client.fetchOne(`${data.count}`, { source: true, envelope: true });
                    if (message && message.source) {
                        console.log(`[IMAP][${this.account.project}] Procesando correo ${data.count}...`);
                        await this.processMessage(message.source);
                    }
                } finally {
                    lock.release();
                }
            } catch (err) {
                console.error(`[ERROR][${this.account.project}] Error procesando nuevo correo:`, err);
            }
        });

        this.client.on('close', async () => {
            console.log(`[IMAP][${this.account.project}] Conexión cerrada. Reconectando en 30s...`);
            setTimeout(() => this.start(), 30000);
        });
    }

    private async scanRecent() {
        console.log(`[IMAP][${this.account.project}] Escaneando correos recientes...`);
        const startOfMonth = new Date();
        startOfMonth.setDate(1);

        let lock = await this.client.getMailboxLock('INBOX');
        try {
            // Busqueda más flexible para Multichunches
            let searchCriteria: any;
            if (this.account.project === 'Etelgive') {
                searchCriteria = { subject: 'RV: SINPEMOVIL', since: startOfMonth };
            } else {
                // Para Multichunches buscamos BN o SINPE
                searchCriteria = {
                    or: [
                        { subject: 'SINPE' },
                        { subject: 'BN' }
                    ],
                    since: startOfMonth
                };
            }

            const messages = await this.client.search(searchCriteria);

            if (!messages || messages.length === 0) {
                const filterUsed = this.account.project === 'Etelgive' ? 'RV: SINPEMOVIL' : 'SINPE o BN';
                console.log(`[IMAP][${this.account.project}] No se encontraron correos con asunto "${filterUsed}" este mes.`);
                return;
            }

            console.log(`[IMAP][${this.account.project}] Se encontraron ${messages.length} correos para procesar.`);

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
                console.log(`[SUCCESS][${project}] Transacción guardada: ${transaction.referencia}`);
                io.emit('new-transaction', { ...transaction, project });
            }
        }
    }

    async scanRescan(startDate: Date) {
        console.log(`[RESCAN][${this.account.project}] Escaneando correos desde ${startDate.toLocaleDateString()}...`);
        let lock = await this.client.getMailboxLock('INBOX');
        try {
            let searchCriteria: any;
            if (this.account.project === 'Etelgive') {
                searchCriteria = { subject: 'RV: SINPEMOVIL', since: startDate };
            } else {
                searchCriteria = {
                    or: [
                        { subject: 'SINPE' },
                        { subject: 'BN' }
                    ],
                    since: startDate
                };
            }

            const messages = await this.client.search(searchCriteria);

            if (!messages || messages.length === 0) {
                console.log(`[RESCAN][${this.account.project}] No se encontraron correos.`);
                return;
            }

            console.log(`[RESCAN][${this.account.project}] Se encontraron ${messages.length} correos.`);

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
        try { await this.client.logout(); } catch (e) {}
    }
}

async function main() {
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
        console.log(`[SISTEMA] Servidor listo en puerto ${PORT}`);
    });

    watchers = config.accounts.map(acc => new SinpeWatcher(acc));
    for (const watcher of watchers) {
        watcher.start();
    }

    const shutdown = async () => {
        for (const w of watchers) await w.stop();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
});
