
const { test, expect } = require('@playwright/test');

test('PA-01 - Inicio de sesión exitoso', async ({ page }) => {
    await page.goto('index.php?route=login');

    await page.locator('#usuario').fill('admin');
    await page.locator('#password').fill('Admin123!');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/route=(colaboradores\.index|usuarios\.index|home)/);
});
