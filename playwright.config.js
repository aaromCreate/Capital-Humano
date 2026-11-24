
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,

  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://localhost/ProyectoFinal-DSVII-CapitalHumano-main/publico/'
  },

  reporter: 'list'
});
