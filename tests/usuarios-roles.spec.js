const { test, expect } = require('@playwright/test');
const { login, logout } = require('./helpers/auth');

test.describe('CP-05 - Usuarios, roles y permisos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('lista usuarios y muestra roles asociados', async ({ page }) => {
    await page.goto('index.php?route=usuarios.index');
    await expect(page.getByRole('heading', { name: 'Usuarios administrativos' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Administrador', exact: true }).first()).toBeVisible();
    await expect(page.getByText('Administrador', { exact: true }).first()).toBeVisible();

    await page.goto('index.php?route=roles.index');
    await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Administrador', exact: true })).toBeVisible();
  });

  test('crea, edita, asigna rol y desactiva un usuario de prueba', async ({ page }) => {
    const suffix = Date.now().toString().slice(-8);
    const username = `qa_${suffix}`;
    const password = 'Prueba123!';

    await page.goto('index.php?route=usuarios.create');
    await page.locator('#nombre').fill('Usuario Prueba');
    await page.locator('#correo').fill(`qa.${suffix}@example.com`);
    await page.locator('#usuario').fill(username);
    await page.locator('#password').fill(password);
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page).toHaveURL(/route=usuarios\.index/);
    await expect(page.getByText('Usuario creado correctamente.')).toBeVisible();
    const row = page.locator('table tbody tr').filter({ hasText: username });
    await expect(row).toBeVisible();

    await row.getByRole('link', { name: 'Editar' }).click();
    await page.locator('#nombre').fill('Usuario Editado');
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await expect(page).toHaveURL(/route=usuarios\.index/);
    await expect(page.getByRole('cell', { name: 'Usuario Editado', exact: true }).first()).toBeVisible();

    const editedRow = page.locator('table tbody tr').filter({ hasText: username });
    await editedRow.getByRole('button', { name: 'Desactivar' }).click();
    await expect(editedRow).toContainText('Inactivo');
  });

  test('valida duplicados y campos de usuario', async ({ page }) => {
    await page.goto('index.php?route=usuarios.create');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.locator('#nombre')).toHaveJSProperty('required', true);
    await expect(page.locator('#password')).toHaveJSProperty('required', true);

    await page.locator('#nombre').fill('Duplicado Prueba');
    await page.locator('#correo').fill('admin@capitalhumano.local');
    await page.locator('#usuario').fill('admin');
    await page.locator('#password').fill('Prueba123!');
    await page.locator('input[name="roles[]"]').first().check();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page).toHaveURL(/route=usuarios\.create/);
    await expect(page.locator('.alert-danger')).toBeVisible();
  });

  test('aplica restricción de servidor a un usuario Consultor', async ({ page }) => {
    const suffix = Date.now().toString().slice(-8);
    const username = `cons_${suffix}`;
    const password = 'Prueba123!';

    await page.goto('index.php?route=usuarios.create');
    await page.locator('#nombre').fill('Consultor Prueba');
    await page.locator('#correo').fill(`consultor.${suffix}@example.com`);
    await page.locator('#usuario').fill(username);
    await page.locator('#password').fill(password);

    await page.getByRole('checkbox', { name: 'Consultor' }).check();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page).toHaveURL(/route=usuarios\.index/);

    await logout(page);
    await login(page, username, password);

    await page.goto('index.php?route=usuarios.index');
    await expect(page).toHaveURL(/route=usuarios\.index/);
    await expect(page.locator('.error-code')).toHaveText('403');

    await page.goto('index.php?route=reportes.index');
    await expect(page.getByRole('heading', { name: 'Reporte de colaboradores' })).toBeVisible();
  });
});
