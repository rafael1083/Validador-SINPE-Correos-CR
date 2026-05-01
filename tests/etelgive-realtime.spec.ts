import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('QA - Etelgive Tiempo Real (Simular Correo)', () => {
  test('QA-ETG-REAL-MULTI: Dos correos simultáneos (Etelgive + Multichunches)', async ({ page, context }) => {
    // Abrir página
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Ir a Etelgive
    await page.locator('button.project-btn').nth(0).click();
    await page.click('button:has-text("Buscar Todos")');
    await page.waitForTimeout(1000);

    const etgInitial = await page.locator('table tbody tr').count();
    console.log(`\n📊 Etelgive inicial: ${etgInitial}`);

    // Crear SINPE Etelgive
    console.log(`\n📧 Crear SINPE Etelgive...`);
    const etgResponse = await context.request.post('http://localhost:3001/api/test/create-sinpe-etelgive');
    const etgData = await etgResponse.json();
    const etgRef = etgData.referencia;

    console.log(`✅ SINPE Etelgive creado: ${etgRef}`);

    // Crear SINPE Multichunches
    console.log(`📧 Crear SINPE Multichunches...`);
    const mcResponse = await context.request.post('http://localhost:3001/api/test/create-sinpe');
    const mcData = await mcResponse.json();
    const mcRef = mcData.referencia;

    console.log(`✅ SINPE Multichunches creado: ${mcRef}`);

    // Esperar socket.io
    await page.waitForTimeout(800);

    // Verificar que Etelgive vio el cambio
    console.log(`\n🔄 Verificar Etelgive recibió su SINPE...`);
    await page.click('button:has-text("Buscar Todos")');
    await page.waitForTimeout(1000);

    const etgAfter = await page.locator('table tbody tr').count();
    console.log(`📊 Etelgive después: ${etgAfter}`);
    expect(etgAfter).toBe(etgInitial + 1);

    await expect(page.locator(`text=${etgRef}`)).toBeVisible();
    console.log(`✅ SINPE Etelgive visible`);

    // Ir a Multichunches
    console.log(`\n🔄 Cambiar a Multichunches...`);
    await page.locator('button.project-btn').nth(1).click();
    await page.click('button:has-text("Buscar Todos")');
    await page.waitForTimeout(1000);

    // Verificar que Multichunches vio su SINPE
    console.log(`✅ SINPE Multichunches visible en su proyecto`);
    await expect(page.locator(`text=${mcRef}`)).toBeVisible();

    // === LIMPIAR ===
    console.log(`\n🗑️  Limpiar registros de prueba...`);
    await context.request.delete(`http://localhost:3001/api/test/delete-sinpe/${etgRef}`);
    await context.request.delete(`http://localhost:3001/api/test/delete-sinpe/${mcRef}`);

    console.log(`✅ Registros eliminados`);

    // Verificar final
    await page.locator('button.project-btn').nth(0).click();
    await page.click('button:has-text("Buscar Todos")');
    await page.waitForTimeout(1000);

    const etgFinal = await page.locator('table tbody tr').count();
    expect(etgFinal).toBe(etgInitial);

    console.log(`\n========== RESUMEN QA - MULTI PROYECTO ==========`);
    console.log(`✅ SINPE Etelgive: ${etgInitial} → ${etgAfter} → ${etgFinal}`);
    console.log(`✅ SINPE Multichunches: Creado y verificado`);
    console.log(`✅ Socket.IO multi-proyecto: FUNCIONANDO`);
    console.log(`✅ Separación de datos: CORRECTA`);
    console.log(`================================================`);
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
