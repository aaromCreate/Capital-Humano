const { test, expect } = require('@playwright/test');
const { login } = require('./helpers/auth');

async function fillColaborador(page, suffix, overrides = {}) {
  await page.locator('[name="identidad"]').fill(overrides.identidad || `TEST-${suffix}`);
  await page.locator('[name="primer_nombre"]').fill(overrides.primer_nombre || 'Carlos');
  await page.locator('[name="segundo_nombre"]').fill('');
  await page.locator('[name="primer_apellido"]').fill(overrides.primer_apellido || 'Mendoza');
  await page.locator('[name="segundo_apellido"]').fill('');
  await page.locator('[name="fecha_nacimiento"]').fill(overrides.fecha_nacimiento || '1995-05-15');
  await page.locator('[name="sexo"]').selectOption({ label: 'Masculino' });
  await page.locator('[name="direccion"]').fill('Ciudad de Panamá');
  await page.locator('[name="correo"]').fill(overrides.correo || `carlos.mendoza.${suffix}@example.com`);
  await page.locator('[name="telefono"]').fill('203-0000');
  await page.locator('[name="celular"]').fill('6100-0000');

  await page.locator('[name="ocupacion_id"]').selectOption({ index: 1 });
  await page.locator('[name="tipo_empleado_id"]').selectOption({ index: 1 });
  await page.locator('[name="planilla_id"]').selectOption({ index: 1 });
  await page.locator('[name="departamento_id"]').selectOption({ index: 1 });
  await page.locator('[name="salario"]').fill('1500.00');
  await page.locator('[name="fecha_inicio"]').fill(overrides.fecha_inicio || '2026-11-18');
  await page.locator('[name="fecha_fin"]').fill('');
}

async function deleteColaboradorByText(page, text) {
  await page.goto('index.php?route=colaboradores.index');
  await page.locator('[name="q"]').fill(text);
  await page.getByRole('button', { name: 'Buscar' }).click();
  const row = page.locator('table tbody tr').filter({ hasText: text });
  if (await row.count()) {
    page.once('dialog', dialog => dialog.accept());
    await row.getByRole('button', { name: 'Eliminar' }).click();
  }
}

test.describe('CP-02 - Gestión de colaboradores', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('lista el módulo y crea, consulta y edita un colaborador', async ({ page }) => {
    const suffix = Date.now().toString().slice(-8);
    const identidad = `TEST-${suffix}`;
    await page.goto('index.php?route=colaboradores.index');
    await expect(page.getByRole('heading', { name: 'Sistema de colaboradores' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    await page.getByRole('link', { name: 'Nuevo colaborador' }).click();
    await fillColaborador(page, suffix, { identidad });
    await page.getByRole('button', { name: 'Guardar colaborador' }).click();

    await expect(page).toHaveURL(/route=colaboradores\.show/);
    await expect(page.getByText('Colaborador registrado correctamente.')).toBeVisible();
    await expect(page.getByText(identidad)).toBeVisible();

    await page.goto('index.php?route=colaboradores.index');
    await page.locator('[name="q"]').fill(identidad);
    await page.getByRole('button', { name: 'Buscar' }).click();
    const row = page.locator('table tbody tr').filter({ hasText: identidad });
    await expect(row).toBeVisible();

    await row.getByRole('link', { name: 'Editar' }).click();
    await page.locator('[name="primer_nombre"]').fill('Roberto');
    await page.getByRole('button', { name: 'Actualizar colaborador' }).click();
    await expect(page).toHaveURL(/route=colaboradores\.show/);
    await expect(page.getByText('Colaborador actualizado correctamente.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Roberto Mendoza' })).toBeVisible();

    await deleteColaboradorByText(page, identidad);
  });

  test('valida campos obligatorios al registrar', async ({ page }) => {
    await page.goto('index.php?route=colaboradores.create');
    await page.getByRole('button', { name: 'Guardar colaborador' }).click();
    await expect(page).toHaveURL(/route=colaboradores\.create/);

    await expect(page.locator('[name="identidad"]')).toBeVisible();
    await expect(page.locator('[name="identidad"]')).toHaveJSProperty('required', true);
  });

  test('rechaza identidad duplicada', async ({ page }) => {
    const suffix = Date.now().toString().slice(-8);
    const identidad = `TEST-${suffix}`;
    await page.goto('index.php?route=colaboradores.create');
    await fillColaborador(page, suffix, { identidad });
    await page.getByRole('button', { name: 'Guardar colaborador' }).click();
    await expect(page).toHaveURL(/route=colaboradores\.show/);

    await page.goto('index.php?route=colaboradores.create');
    await fillColaborador(page, `${suffix}-dup`, { identidad, correo: `dup.${suffix}@example.com` });
    await page.getByRole('button', { name: 'Guardar colaborador' }).click();
    await expect(page).toHaveURL(/route=colaboradores\.create/);
    await expect(page.locator('.alert-danger')).toBeVisible();

    await deleteColaboradorByText(page, identidad);
  });
});
