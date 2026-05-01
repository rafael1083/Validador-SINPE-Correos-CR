import { test, expect } from '@playwright/test';

test.describe('Validador SINPE - UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('QA-09: Cargar página - Multichunches con Michelle y Anier', async ({ page }) => {
    // Click en botón Multichunches (segundo project-btn)
    const buttons = page.locator('button.project-btn');
    await buttons.nth(1).click();
    await page.waitForTimeout(500);

    // Click Buscar Todos
    await page.click('button:has-text("Buscar Todos")');
    await page.waitForTimeout(1000);

    // Contar transacciones
    const rows = await page.locator('table tbody tr').count();
    console.log(`Transacciones Multichunches: ${rows}`);
    expect(rows).toBeGreaterThan(0);

    // Verificar Michelle y Anier visibles
    await expect(page.locator('text=Michelle Francinie Zelaya')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Anier Gonzalez')).toBeVisible();
  });

  test('QA-04: Sync actualiza CSV correctamente', async ({ page }) => {
    // Click Multichunches
    await page.locator('button.project-btn').nth(1).click();
    await page.waitForTimeout(300);

    // Click botón Sincronizar y Descargar
    const syncButton = page.locator('button:has-text("Sincronizar y Descargar")');
    await expect(syncButton).toBeVisible();
    await syncButton.click();

    // Esperar un poco para que sincronice
    await page.waitForTimeout(2000);

    // Click Buscar Todos para refrescar
    await page.click('button:has-text("Buscar Todos")');
    await page.waitForTimeout(1000);

    // Verificar que datos están intactos
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(22);

    // Michelle y Anier siguen visibles
    await expect(page.locator('text=Michelle Francinie Zelaya')).toBeVisible();
    await expect(page.locator('text=Anier Gonzalez')).toBeVisible();

    console.log('✅ Sync completado, datos intactos');
  });
});
