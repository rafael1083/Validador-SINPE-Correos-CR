
import { parseSinpeEmail } from './src/parser';

const email1 = `
Notificación BN
-------------------
Ha recibido 3,200.00 colones por BN SINPE MOVIL de ERICK ALBERTO SEGURA. Pase-89672123. Referencia 2026042515183010545653569.
---—---------------
SINPE Multichunches
`;

const email2 = `
Notificación BN
-------------------
Ha recibido 10 colones por BN SINPE MOVIL de ALVARADO TORRES RAFAEL ALFONSO GERARDO. Transferencia_SINPE. Referencia 2026042515283009381805981.
---—---------------
SINPE Multichunches
`;

console.log('--- TEST EMAIL 1 ---');
const res1 = parseSinpeEmail(email1, new Date(), 'Multichunches');
console.log(JSON.stringify(res1, null, 2));

console.log('\n--- TEST EMAIL 2 ---');
const res2 = parseSinpeEmail(email2, new Date(), 'Multichunches');
console.log(JSON.stringify(res2, null, 2));

const email3 = `
Notificación BN
-------------------
Ha recibido ¢5,000 por BN SINPE MOVIL de MARIA PEREZ. Pago de servicio. Referencia 2026042515283009381805999.
---—---------------
SINPE Multichunches
`;

console.log('\n--- TEST EMAIL 3 (Simbolo ¢) ---');
const res3 = parseSinpeEmail(email3, new Date(), 'Multichunches');
console.log(JSON.stringify(res3, null, 2));
