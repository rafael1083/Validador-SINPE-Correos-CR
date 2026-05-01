import { test, expect } from '@playwright/test';

test.describe('QA - Validación Etelgive (BCR)', () => {
  test('QA-ETG-01: CSV no corrupto - Todos los registros OK', async ({ context }) => {
    // Obtener todos los datos de Etelgive
    const response = await context.request.get('http://localhost:3001/api/transactions?project=Etelgive');
    const transactions = await response.json();

    console.log(`\n📊 CSV Etelgive - Análisis:`);
    console.log(`   Total registros: ${transactions.length}`);
    console.log(`   Rango de fechas: ${transactions[0]?.fecha} a ${transactions[transactions.length - 1]?.fecha}`);

    // Validaciones
    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions.length).toBeGreaterThanOrEqual(14); // Esperado: 14 registros sin corrupción

    // Verificar que todos tienen campos válidos
    for (const tx of transactions) {
      expect(tx.referencia).toBeTruthy();
      expect(tx.nombreOrigen).toBeTruthy();
      expect(tx.monto).toBeTruthy();
      expect(tx.fecha).toBeTruthy();
      expect(tx.proyecto).toBe('Etelgive');
    }

    console.log(`✅ CSV Etelgive: Sin corrupción, ${transactions.length} registros válidos`);
  });

  test('QA-ETG-07: Comparación Multichunches vs Etelgive', async ({ context }) => {
    // Obtener datos de ambos proyectos
    const etgResponse = await context.request.get('http://localhost:3001/api/transactions?project=Etelgive');
    const mcResponse = await context.request.get('http://localhost:3001/api/transactions?project=Multichunches');

    const etgData = await etgResponse.json();
    const mcData = await mcResponse.json();

    console.log(`\n📊 Comparación de proyectos:`);
    console.log(`   Etelgive (BCR):        ${etgData.length} registros`);
    console.log(`   Multichunches (BN):    ${mcData.length} registros`);
    console.log(`   Total:                 ${etgData.length + mcData.length} registros`);

    // Validaciones
    expect(etgData.length).toBeGreaterThanOrEqual(14);
    expect(mcData.length).toBeGreaterThan(22); // Multichunches tiene Michelle + test records

    // Verificar que todos están en sus proyectos correctos
    for (const tx of etgData) {
      expect(tx.proyecto).toBe('Etelgive');
    }

    for (const tx of mcData) {
      expect(tx.proyecto).toBe('Multichunches');
    }

    console.log(`✅ Ambos proyectos integros y separados correctamente`);
  });
});
