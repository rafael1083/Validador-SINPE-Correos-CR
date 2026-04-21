import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('SINPE QA - Prueba de caso ficticio', () => {
    const API_BASE = 'http://localhost:3001/api';
    let testReferenciaMultichunches: string;
    let testReferenciaEtelgive: string;

    test('1. Crear transacción ficticia Multichunches', async ({ request }) => {
        const response = await request.post(`${API_BASE}/test/create-sinpe`, {
            headers: { 'Content-Type': 'application/json' },
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.referencia).toBeTruthy();

        testReferenciaMultichunches = data.referencia;
        console.log(`✓ SINPE Multichunches creado: ${testReferenciaMultichunches}`);
    });

    test('2. Crear transacción ficticia Etelgive', async ({ request }) => {
        const response = await request.post(`${API_BASE}/test/create-sinpe-etelgive`, {
            headers: { 'Content-Type': 'application/json' },
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.referencia).toBeTruthy();

        testReferenciaEtelgive = data.referencia;
        console.log(`✓ SINPE Etelgive creado: ${testReferenciaEtelgive}`);
    });

    test('3. Leer todas las transacciones - Verificar que aparecen en tiempo real', async ({ request }) => {
        // Esperar a que se procesen
        await new Promise(r => setTimeout(r, 500));

        const response = await request.get(`${API_BASE}/transactions`);
        expect(response.status()).toBe(200);

        const transactions = await response.json();
        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBeGreaterThan(0);

        console.log(`✓ Total transacciones obtenidas: ${transactions.length}`);
        console.log(`Transacciones en base:`);
        transactions.forEach(t => {
            console.log(`  - REF: ${t.referencia} | MONTO: ${t.monto} | PROYECTO: ${t.proyecto}`);
        });
    });

    test('4. Verificar que transacción Multichunches está en respuesta', async ({ request }) => {
        const response = await request.get(`${API_BASE}/transactions?project=Multichunches`);
        expect(response.status()).toBe(200);

        const transactions = await response.json();
        const found = transactions.find((t: any) => t.referencia === testReferenciaMultichunches);

        expect(found).toBeTruthy();
        expect(found.proyecto).toBe('Multichunches');
        expect(found.monto).toBe('1234.56');
        console.log(`✓ Transacción Multichunches verificada: ${JSON.stringify(found)}`);
    });

    test('5. Verificar que transacción Etelgive está en respuesta', async ({ request }) => {
        const response = await request.get(`${API_BASE}/transactions?project=Etelgive`);
        expect(response.status()).toBe(200);

        const transactions = await response.json();
        const found = transactions.find((t: any) => t.referencia === testReferenciaEtelgive);

        expect(found).toBeTruthy();
        expect(found.proyecto).toBe('Etelgive');
        expect(found.monto).toBe('5678.90');
        console.log(`✓ Transacción Etelgive verificada: ${JSON.stringify(found)}`);
    });

    test('6. Verificar lectura de transacciones de la semana actual', async ({ request }) => {
        const response = await request.get(`${API_BASE}/transactions/week`);
        expect(response.status()).toBe(200);

        const weekTransactions = await response.json();
        expect(Array.isArray(weekTransactions)).toBe(true);
        console.log(`✓ Transacciones de semana obtenidas: ${weekTransactions.length}`);
    });

    test('7. Verificar lectura de transacciones del mes actual', async ({ request }) => {
        const response = await request.get(`${API_BASE}/transactions/month`);
        expect(response.status()).toBe(200);

        const monthTransactions = await response.json();
        expect(Array.isArray(monthTransactions)).toBe(true);
        console.log(`✓ Transacciones del mes obtenidas: ${monthTransactions.length}`);
    });

    test('8. Descargar CSV de transacciones de la semana', async ({ request }) => {
        const response = await request.get(`${API_BASE}/transactions/week/csv?project=Multichunches`);
        expect(response.status()).toBe(200);

        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('text/csv');
        console.log(`✓ CSV descargado correctamente (${contentType})`);
    });

    test('9. Descargar CSV de transacciones del mes', async ({ request }) => {
        const response = await request.get(`${API_BASE}/transactions/month/csv?project=Etelgive`);
        expect(response.status()).toBe(200);

        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('text/csv');
        console.log(`✓ CSV mes descargado correctamente`);
    });

    test('10. Eliminar transacción Multichunches y verificar que desaparece', async ({ request }) => {
        // Verificar que existe antes
        let response = await request.get(`${API_BASE}/transactions?project=Multichunches`);
        let transactions = await response.json();
        let found = transactions.find((t: any) => t.referencia === testReferenciaMultichunches);
        expect(found).toBeTruthy();
        console.log(`✓ Transacción existe antes de eliminar`);

        // Eliminar
        const deleteResponse = await request.delete(
            `${API_BASE}/test/delete-sinpe/${testReferenciaMultichunches}`
        );
        expect(deleteResponse.status()).toBe(200);
        const deleteData = await deleteResponse.json();
        expect(deleteData.success).toBe(true);
        console.log(`✓ Transacción eliminada. Registros restantes: ${deleteData.remaining}`);

        // Esperar y verificar que desapareció
        await new Promise(r => setTimeout(r, 300));
        response = await request.get(`${API_BASE}/transactions?project=Multichunches`);
        transactions = await response.json();
        found = transactions.find((t: any) => t.referencia === testReferenciaMultichunches);
        expect(found).toBeUndefined();
        console.log(`✓ Transacción eliminada correctamente (verificado en tiempo real)`);
    });

    test('11. Eliminar transacción Etelgive y verificar que desaparece', async ({ request }) => {
        // Verificar que existe antes
        let response = await request.get(`${API_BASE}/transactions?project=Etelgive`);
        let transactions = await response.json();
        let found = transactions.find((t: any) => t.referencia === testReferenciaEtelgive);
        expect(found).toBeTruthy();
        console.log(`✓ Transacción existe antes de eliminar`);

        // Eliminar
        const deleteResponse = await request.delete(
            `${API_BASE}/test/delete-sinpe/${testReferenciaEtelgive}`
        );
        expect(deleteResponse.status()).toBe(200);
        const deleteData = await deleteResponse.json();
        expect(deleteData.success).toBe(true);
        console.log(`✓ Transacción eliminada. Registros restantes: ${deleteData.remaining}`);

        // Esperar y verificar que desapareció
        await new Promise(r => setTimeout(r, 300));
        response = await request.get(`${API_BASE}/transactions?project=Etelgive`);
        transactions = await response.json();
        found = transactions.find((t: any) => t.referencia === testReferenciaEtelgive);
        expect(found).toBeUndefined();
        console.log(`✓ Transacción eliminada correctamente (verificado en tiempo real)`);
    });

    test('12. Sincronizar CSV', async ({ request }) => {
        const response = await request.get(`${API_BASE}/sync-csv`);
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        console.log(`✓ CSV sincronizado. Total transacciones: ${data.count}`);
    });

    test.afterAll(async () => {
        console.log('\n📋 LIMPIEZA POST-TEST: Revisando y eliminando registros QA...\n');

        const csvFiles = [
            path.join(__dirname, '../data/sinpes_multichunches.csv'),
            path.join(__dirname, '../data/sinpes_etelgive.csv')
        ];

        const qaPatternsToRemove = [
            '1234.56',      // Monto Multichunches test
            '5678.90',      // Monto Etelgive test
            'Prueba QA',    // Motivo común
            'TEST',         // Palabra clave
            'Test Usuario'  // Nombre test
        ];

        for (const csvFile of csvFiles) {
            if (!fs.existsSync(csvFile)) {
                console.log(`⚠️  ${path.basename(csvFile)} no encontrado`);
                continue;
            }

            try {
                let content = fs.readFileSync(csvFile, 'utf-8');
                const lines = content.split('\n');

                // Separar header y datos
                const header = lines[0];
                const dataLines = lines.slice(1);

                // Filtrar líneas que contengan patrones QA
                let removedCount = 0;
                const filteredLines = dataLines.filter(line => {
                    if (!line.trim()) return true; // Mantener líneas vacías

                    const shouldRemove = qaPatternsToRemove.some(pattern =>
                        line.includes(pattern)
                    );

                    if (shouldRemove) {
                        console.log(`  🗑️  Removida: ${line.substring(0, 80)}...`);
                        removedCount++;
                    }

                    return !shouldRemove;
                });

                // Escribir CSV limpio
                if (removedCount > 0) {
                    const newContent = [header, ...filteredLines].join('\n');
                    fs.writeFileSync(csvFile, newContent, 'utf-8');
                    console.log(`✅ ${path.basename(csvFile)}: ${removedCount} registro(s) eliminado(s)\n`);
                } else {
                    console.log(`✅ ${path.basename(csvFile)}: Sin registros QA detectados\n`);
                }
            } catch (error) {
                console.error(`❌ Error limpiando ${path.basename(csvFile)}:`, error);
            }
        }

        console.log('✓ Limpieza completada. CSV listo para producción.\n');
    });
});
