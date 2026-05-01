
import { ImapFlow, FetchMessageObject } from 'imapflow';
import { loadConfig } from './src/config';
import { simpleParser } from 'mailparser';

async function test() {
    const config = loadConfig();
    const account = config.accounts.find(a => a.project === 'Etelgive');
    
    if (!account) {
        console.error('No se encontró la cuenta de Etelgive');
        return;
    }

    console.log(`Probando conexión para ${account.project} (${account.user})...`);

    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: account.port,
        secure: true,
        auth: { user: account.user, pass: account.pass },
        logger: false
    });

    try {
        await client.connect();
        console.log('Conectado.');

        let lock = await client.getMailboxLock('INBOX');
        try {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0,0,0,0);

            console.log(`Buscando correos desde ${startOfMonth.toISOString()}...`);

            const searchCriteria = {
                subject: 'SINPEMOVIL',
                since: startOfMonth
            };

            const messages = await client.search(searchCriteria);
            if (!messages) {
                console.log('No se encontraron correos.');
            } else {
                console.log(`Encontrados ${messages.length} correos.`);

                for (const seq of messages.slice(-5)) { 
                    const msg: FetchMessageObject | false = await client.fetchOne(seq.toString(), { envelope: true, source: true });
                    if (msg && msg.envelope) {
                        console.log(`- Asunto: ${msg.envelope.subject} | Fecha: ${msg.envelope.date}`);
                        
                        if (msg.source) {
                            const parsed = await simpleParser(msg.source);
                            const body = (parsed.text || parsed.textAsHtml || '').toString();
                            console.log(`  Body preview: ${body.substring(0, 100).replace(/\n/g, ' ')}...`);
                        }
                    }
                }
            }
        } finally {
            lock.release();
        }

        await client.logout();
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
