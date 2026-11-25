const { test, expect } = require('@playwright/test');
const { login } = require('./helpers/auth');

function futureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

let nextVacationOffset = 1000 + (Date.now() % 200);

function uniqueFutureOffset() {
  const offset = nextVacationOffset;
  nextVacationOffset += 7;
  return offset;
}

async function createVacation(page, suffix, startOffset = 30) {
  await page.goto('index.php?route=vacaciones.create');
  const options = page.locator('[name="colaborador_id"] option:not([value=""])');
  await expect(options.first()).toBeAttached();
  const selectable = await options.evaluateAll(elements => elements
    .map(element => ({
      value: element.value,
      balance: Number(((element.textContent.match(/([\d,.]+)\s+días disponibles/) || [])[1] || '0').replace(/,/g, '')),
    }))
    .filter(option => option.balance >= 7)
    .sort((a, b) => b.balance - a.balance)[0]);
  if (!selectable) {
    throw new Error('No hay colaboradores activos con al menos 7 días disponibles para la prueba.');
  }

  await page.locator('[name="colaborador_id"]').selectOption(selectable.value);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const offset = startOffset + attempt * 7;
    await page.locator('[name="fecha_inicio"]').fill(futureDate(offset));
    await page.locator('[name="fecha_fin"]').fill(futureDate(offset + 6));
    await page.locator('[name="observaciones"]').fill(`Prueba automatizada ${suffix}`);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.getByRole('button', { name: 'Guardar solicitud' }).click(),
    ]);

    if (/route=vacaciones\.index/.test(page.url())) {
      await expect(page.getByText('Solicitud registrada correctamente.')).toBeVisible();
      return;
    }

    const error = await page.locator('.alert-danger').innerText();
    if (!/ya tiene una solicitud pendiente o aprobada en ese periodo/i.test(error)) {
      throw new Error(`No se pudo crear la solicitud de vacaciones: ${error}`);
    }
  }

  throw new Error('No se encontró un período libre para la solicitud de vacaciones de prueba.');
}

test.describe('CP-03 - Gestión de vacaciones', () => {
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
