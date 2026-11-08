import { expect, loginAs, selectOption, test } from './fixtures';

test('presupuesto con la alerta al cruzar el 80 %', async ({ page, testUser }) => {
  await loginAs(page, testUser, '/presupuestos');

  // Budget of 100.000 for Comida this month.
  await page.getByRole('button', { name: 'Nuevo presupuesto' }).click();
  const budgetDialog = page.getByRole('dialog', { name: 'Nuevo presupuesto' });
  await selectOption(page, 'Categoría', 'Comida');
  await budgetDialog.getByLabel('Límite del mes').fill('100.000');
  await budgetDialog.getByRole('button', { name: 'Crear presupuesto' }).click();
  await expect(budgetDialog).toBeHidden();
  await expect(page.getByText(/\$\s0 de \$\s100\.000/)).toBeVisible();

  // An 85.000 expense crosses 80 %: the notice appears right after saving.
  await page.goto('/transacciones');
  await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click();
  const txDialog = page.getByRole('dialog', { name: 'Nuevo movimiento' });
  await txDialog.getByLabel('Monto').fill('85.000');
  await selectOption(page, 'Categoría', 'Comida');
  await txDialog.getByRole('button', { name: 'Guardar movimiento' }).click();

  const notice = page.getByRole('status').filter({ hasText: 'Con este gasto' });
  await expect(notice).toContainText(/llegaste al 85\s%\sde tu presupuesto de Comida/);
  await expect(notice.getByRole('link', { name: 'Ver presupuestos' })).toBeVisible();

  // The dashboard lists the warning for this month.
  await page.goto('/dashboard');
  const alerts = page.getByRole('region', { name: 'Alertas de presupuesto' });
  await expect(alerts).toContainText(/Llevas el 85\s%\sde Comida, te quedan \$\s15\.000/);
});
