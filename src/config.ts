import fs from 'fs';
import path from 'path';

export interface EmailAccount {
    user: string;
    pass: string;
    port: number;
    project: string;
}

export interface EmailConfig {
    accounts: EmailAccount[];
    remitenteDefault: string;
    asuntoDefault: string;
}

export function loadConfig(): EmailConfig {
    const configPath = path.join(__dirname, '../imap.txt');
    const remitentesPath = path.join(__dirname, '../remitentes.txt');
    
    let accounts: EmailAccount[] = [];
    let remitenteDefault = 'elmensajero@bancobcr.com';
    let asuntoDefault = 'SINPEMOVIL';

    try {
        const content = fs.readFileSync(configPath, 'utf8').trim();
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            if (!line.trim()) return;
            const [u, p, portStr] = line.split(',');
            if (u && p) {
                accounts.push({
                    user: u.trim(),
                    pass: p.trim(),
                    port: 993, // Gmail por defecto
                    project: index === 0 ? 'Etelgive' : 'Multichunches'
                });
            }
        });
    } catch (error) {
        console.error('Error cargando imap.txt:', error);
        process.exit(1);
    }

    try {
        if (fs.existsSync(remitentesPath)) {
            const content = fs.readFileSync(remitentesPath, 'utf8').trim();
            const [r, a] = content.split(',');
            if (r) remitenteDefault = r.trim();
            if (a) asuntoDefault = a.trim();
        }
    } catch (error) {
        console.warn('Advertencia: No se pudo leer remitentes.txt');
    }

    return { accounts, remitenteDefault, asuntoDefault };
}
