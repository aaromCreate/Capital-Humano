const { test, expect } = require('@playwright/test');
const { login } = require('./helpers/auth');

test.describe('CP-04 - Reportes y estadísticas', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('carga filtros y genera resultados aplicando sexo y rango de edad', async ({ page }) => {
    await page.goto('index.php?route=reportes.index');
    await expect(page.getByRole('heading', { name: 'Reporte de colaboradores' })).toBeVisible();
    await expect(page.locator('[name="q"]')).toBeVisible();
    await expect(page.locator('[name="sexo"]')).toBeVisible();
    await expect(page.locator('[name="edad"]')).toBeVisible();
    await expect(page.locator('[name="direccion"]')).toBeVisible();
    await expect(page.locator('[name="salario_min"]')).toBeVisible();
    await expect(page.locator('[name="salario_max"]')).toBeVisible();

    await page.locator('[name="sexo"]').selectOption({ label: 'Masculino' });
    await page.locator('[name="edad"]').selectOption({ label: '26-35' });
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page).toHaveURL(/route=reportes\.index/);
    await expect(page.getByText('Estadísticas')).toBeVisible();
  });

  test('muestra el estado vacío para filtros sin resultados', async ({ page }) => {
    await page.goto('index.php?route=reportes.index');
    await page.locator('[name="q"]').fill(`SIN-RESULTADOS-${Date.now()}`);
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText('No hay registros para el reporte.')).toBeVisible();
  });

  test('descarga el archivo Excel con los filtros aplicados', async ({ page }) => {
    await page.goto('index.php?route=reportes.index');
    await page.locator('[name="sexo"]').selectOption({ label: 'Femenino' });
    await page.getByRole('button', { name: 'Buscar' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Exportar Excel' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });
});
