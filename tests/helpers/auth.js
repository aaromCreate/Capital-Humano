async function login(page, usuario = 'admin', password = 'Admin123!') {
  await page.goto('index.php?route=login');
  await page.locator('#usuario').fill(usuario);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('domcontentloaded');
}

async function logout(page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expectLoginPage(page);
}

async function expectLoginPage(page) {
  await page.waitForURL(/route=login/);
  await page.getByRole('heading', { name: 'Sistema de Capital Humano' }).waitFor();
}

module.exports = { login, logout, expectLoginPage };
