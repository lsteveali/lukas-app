import { expect, loginAs, test, waitForLoginForm } from './fixtures';

test.describe('autenticación', () => {
  test('una ruta protegida lleva al login y vuelve después de iniciar sesión', async ({
    page,
    testUser,
  }) => {
    await page.goto('/transacciones?mes=2026-11');
    await expect(page).toHaveURL(/\/login\?next=%2Ftransacciones%3Fmes%3D2026-11/);

    await waitForLoginForm(page);
    await page.getByLabel('Correo').fill(testUser.email);
    await page.getByLabel('Contraseña').fill(testUser.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/transacciones\?mes=2026-11$/);
    await expect(page.getByRole('heading', { name: 'Movimientos' })).toBeVisible();
  });

  test('credenciales incorrectas muestran el error en español', async ({ page, testUser }) => {
    await page.goto('/login');
    await waitForLoginForm(page);
    await page.getByLabel('Correo').fill(testUser.email);
    await page.getByLabel('Contraseña').fill('NoEsLaClave1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('cerrar sesión desde el menú del avatar', async ({ page, testUser }) => {
    await loginAs(page, testUser);
    await expect(page.getByRole('heading', { name: /Hola, Ana/ })).toBeVisible();

    // The avatar menu streams in; retry the tap until the menu opens.
    const signOut = page.getByRole('menuitem', { name: 'Cerrar sesión' });
    await expect(async () => {
      if (!(await signOut.isVisible())) {
        await page.getByRole('button', { name: `Menú de ${testUser.fullName}` }).click();
      }
      await expect(signOut).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await signOut.click();

    await expect(page).toHaveURL(/\/login$/);
    // The session is gone: protected pages send you back to login.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });
});
