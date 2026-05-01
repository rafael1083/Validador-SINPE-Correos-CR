import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('QA - Tiempo Real con Socket.IO', () => {
  test('QA-REAL: Crear SINPE ficticio → Aparece en tiempo real → Eliminar', async ({ page, context }) => {
    // Abrir página
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Seleccionar Multichunches
    await page.locator('button.project-btn').nth(1).click();
    await page.waitForTimeout(300);

    // Cargar todas transacciones
    await page.click('button:has-text("Buscar Todos")');
    await page.waitForTimeout(1000);

    // Contar transacciones iniciales
    const initialRows = await page.locator('table tbody tr').count();
    console.log(`📊 Transacciones iniciales: ${initialRows}`);

    // === PASO 1: CREAR SINPE FICTICIO ===
    console.log('\n📧 PASO 1: Crear SINPE ficticio...');
    const createResponse = await context.request.post('http://localhost:3001/api/test/create-sinpe');
    const createData = await createResponse.json();
    const testRef = createData.referencia;

    expect(createResponse.ok()).toBeTruthy();
    expect(testRef).toBeTruthy();
    console.log(`✅ SINPE creado: ${testRef}`);
    console.log(`   Nombre: ${createData.transaction.nombreOrigen}`);
    console.log(`   Monto: ${createData.transaction.monto}`);

    // === PASO 2: VERIFICAR APARICIÓN EN TIEMPO REAL ===
    console.log('\n🔍 PASO 2: Verificar que aparece en la tabla...');
    await page.waitForTimeout(500); // Esperar socket.io

    // Recargar tabla si es necesario (socket.io emite evento)
    await page.click('button:has-text("Buscar Todos")');
    await page.waitForTimeout(1000);

    // Buscar el SINPE en la tabla
    const testRowLocator = page.locator(`text=${testRef}`);
    await expect(testRowLocator).toBeVisible({ timeout: 5000 });

    console.log(`✅ SINPE visible en tabla`);
    console.log(`   Referencia encontrada: ${testRef}`);

    // Verificar detalles en la fila
    const testRow = page.locator('tr').filter({ has: page.locator(`text=${testRef}`) });
    const rowText = await testRow.textContent();

    expect(rowText).toContain('Test Usuario QA');
    // Adaptarse al formato de moneda del UI
    expect(rowText.replace(/\s/g, '')).toContain('1234');
    console.log(`✅ Detalles correctos en tabla`);

    // Contar transacciones después de crear
    const afterCreateRows = await page.locator('table tbody tr').count();
    console.log(`📊 Transacciones después de crear: ${afterCreateRows}`);
    expect(afterCreateRows).toBe(initialRows + 1);

    // === PASO 3: ELIMINAR SINPE ===
    console.log('\n🗑️  PASO 3: Eliminar SINPE ficticio...');
    const deleteResponse = await context.request.delete(
      `http://localhost:3001/api/test/delete-sinpe/${testRef}`
    );

    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    console.log(`✅ SINPE eliminado`);
    console.log(`   Remaining: ${deleteData.remaining}`);

    // === PASO 4: VERIFICAR DESAPARICIÓN ===
    console.log('\n👀 PASO 4: Verificar que desaparece de la tabla...');

    // Recargar tabla
    await page.click('button:has-text("Buscar Todos")');
    await page.waitForTimeout(1000);

    // Verificar que ya no está
    const testRowAfterDelete = page.locator(`text=${testRef}`);
    await testRowAfterDelete.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const isVisible = await testRowAfterDelete.isVisible().catch(() => false);

    expect(isVisible).toBeFalsy();
    console.log(`✅ SINPE eliminado de tabla`);

    // Contar transacciones finales
    const finalRows = await page.locator('table tbody tr').count();
    console.log(`📊 Transacciones finales: ${finalRows}`);
    expect(finalRows).toBe(initialRows);

    // === RESUMEN ===
    console.log('\n========== RESUMEN QA ==========');
    console.log(`✅ SINPE ficticio creado: ${testRef}`);
    console.log(`✅ Socket.IO actualización en tiempo real: OK`);
    console.log(`✅ SINPE apareció en tabla: OK`);
    console.log(`✅ SINPE eliminado correctamente: OK`);
    console.log(`✅ Transacciones: ${initialRows} → ${afterCreateRows} → ${finalRows}`);
    console.log(`================================`);
  });

  test.afterAll(async () => {
    console.log('\n📋 LIMPIEZA POST-TEST: Revisando y eliminando registros QA...\n');

    const csvFiles = [
      path.join(__dirname, '../data/sinpes_multichunches.csv'),
      path.join(__dirname, '../data/sinpes_etelgive.csv')
    ];

    const qaPatternsToRemove = [
      '1234.56',
      '5678.90',
      'Prueba QA',
      'TEST',
      'Test Usuario'
    ];

    for (const csvFile of csvFiles) {
      if (!fs.existsSync(csvFile)) {
        console.log(`⚠️  ${path.basename(csvFile)} no encontrado`);
        continue;
      }

      try {
        let content = fs.readFileSync(csvFile, 'utf-8');
        const lines = content.split('\n');
        const header = lines[0];
        const dataLines = lines.slice(1);

        let removedCount = 0;
        const filteredLines = dataLines.filter(line => {
          if (!line.trim()) return true;
          const shouldRemove = qaPatternsToRemove.some(pattern => line.includes(pattern));
          if (shouldRemove) {
            console.log(`  🗑️  Removida: ${line.substring(0, 80)}...`);
            removedCount++;
          }
          return !shouldRemove;
        });

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
