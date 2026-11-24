const { test, expect } = require('@playwright/test');
const { login } = require('./helpers/auth');

function futureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

function uniqueFutureOffset() {
  return 1000 + (Date.now() % 200);
}

async function createVacation(page, suffix, startOffset = 30) {
  await page.goto('index.php?route=vacaciones.create');
  const options = page.locator('[name="colaborador_id"] option:not([value=""])');
  await expect(options.first()).toBeAttached();
  const selectable = await options.evaluateAll(elements => elements
    .map(element => ({
      value: element.value,
      balance: Number((element.textContent.match(/([\d.]+)\s+días disponibles/) || [])[1] || 0),
    }))
    .sort((a, b) => b.balance - a.balance)[0]);
  await page.locator('[name="colaborador_id"]').selectOption(selectable.value);
  await page.locator('[name="fecha_inicio"]').fill(futureDate(startOffset));
  await page.locator('[name="fecha_fin"]').fill(futureDate(startOffset + 6));
  await page.locator('[name="observaciones"]').fill(`Prueba automatizada ${suffix}`);
  await page.getByRole('button', { name: 'Guardar solicitud' }).click();
  await expect(page).toHaveURL(/route=vacaciones\.index/);
  await expect(page.getByText('Solicitud registrada correctamente.')).toBeVisible();
}

test.describe('CP-05 - Gestión de vacaciones', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('lista solicitudes y crea una solicitud pendiente por al menos 7 días', async ({ page }) => {
    await page.goto('index.php?route=vacaciones.index');
    await expect(page.getByRole('heading', { name: 'Solicitudes de vacaciones' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    await createVacation(page, Date.now().toString(), uniqueFutureOffset());
    const row = page.locator('table tbody tr').first();
    await expect(row).toBeVisible();
    await expect(row.locator('[class*="badge"]')).toHaveText('Pendiente');
  });

  test('rechaza una solicitud pendiente nueva', async ({ page }) => {
    await createVacation(page, `rechazo-${Date.now()}`, uniqueFutureOffset());
    const row = page.locator('table tbody tr').first();
    await row.getByRole('button', { name: 'Rechazar' }).click();
    await expect(page).toHaveURL(/route=vacaciones\.index/);
    await expect(row.locator('[class*="badge"]')).toHaveText('Rechazada');
  });

  test('aprueba una solicitud pendiente nueva', async ({ page }) => {
    await createVacation(page, `aprobacion-${Date.now()}`, uniqueFutureOffset());
    const row = page.locator('table tbody tr').first();
    await row.getByRole('button', { name: 'Aprobar' }).click();
    await expect(page).toHaveURL(/route=vacaciones\.index/);
    await expect(row.locator('[class*="badge"]')).toHaveText('Aprobada');
  });

  test('rechaza fechas fin anteriores y solicitudes menores de 7 días', async ({ page }) => {
    await page.goto('index.php?route=vacaciones.create');
    await page.locator('[name="colaborador_id"]').selectOption({ index: 1 });
    await page.locator('[name="fecha_inicio"]').fill(futureDate(150));
    await page.locator('[name="fecha_fin"]').fill(futureDate(149));
    await page.getByRole('button', { name: 'Guardar solicitud' }).click();
    await expect(page).toHaveURL(/route=vacaciones\.create/);
    await expect(page.locator('.alert-danger')).toContainText(/fecha fin|anterior|7 dias/i);
  });

  test('valida campos obligatorios', async ({ page }) => {
    await page.goto('index.php?route=vacaciones.create');
    await page.getByRole('button', { name: 'Guardar solicitud' }).click();
    await expect(page).toHaveURL(/route=vacaciones\.create/);
    await expect(page.locator('[name="colaborador_id"]')).toHaveJSProperty('required', true);
  });
});
