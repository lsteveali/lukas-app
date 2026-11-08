import { expect, loginAs, test } from './fixtures';

test('meta con aporte, retiro y retiro rechazado', async ({ page, testUser }) => {
  await loginAs(page, testUser, '/metas');

  // Create the goal from the empty state.
  await page.getByRole('button', { name: 'Crear mi primera meta' }).click();
  const goalDialog = page.getByRole('dialog', { name: 'Nueva meta' });
  await goalDialog.getByLabel('Nombre').fill('Viaje a Cartagena');
  await goalDialog.getByLabel('¿Cuánto quieres ahorrar?').fill('1.000.000');
  await goalDialog.getByRole('button', { name: 'Crear meta' }).click();
  await expect(goalDialog).toBeHidden();

  // Open the detail page from the card.
  await page.getByRole('link', { name: 'Ver aportes de Viaje a Cartagena' }).click();
  await expect(page.getByRole('heading', { name: 'Viaje a Cartagena' })).toBeVisible();
  await expect(page.getByText('Aún no hay aportes. Empieza con el primero.')).toBeVisible();

  // Deposit 100.000.
  await page.getByRole('button', { name: 'Aportar' }).click();
  const depositDialog = page.getByRole('dialog', { name: /Aportar a/ });
  await depositDialog.getByLabel('Monto').fill('100.000');
  await depositDialog.getByRole('button', { name: 'Registrar aporte' }).click();
  await expect(depositDialog).toBeHidden();
  await expect(page.getByText(/^\+\$\s100\.000$/)).toBeVisible();

  // Withdraw 30.000 → 70.000 saved.
  await page.getByRole('button', { name: 'Retirar' }).click();
  const withdrawDialog = page.getByRole('dialog', { name: /Retirar de/ });
  await expect(withdrawDialog).toContainText(/Disponible para retirar: \$\s100\.000/);
  await withdrawDialog.getByLabel('Monto').fill('30.000');
  await withdrawDialog.getByLabel('Nota (opcional)').fill('Tiquetes');
  await withdrawDialog.getByRole('button', { name: 'Registrar retiro' }).click();
  await expect(withdrawDialog).toBeHidden();
  await expect(page.getByText(/\$\s70\.000 de \$\s1\.000\.000/)).toBeVisible();
  await expect(page.getByText('Tiquetes')).toBeVisible();

  // Withdrawing more than what is saved is rejected and nothing changes.
  await page.getByRole('button', { name: 'Retirar' }).click();
  const rejectedDialog = page.getByRole('dialog', { name: /Retirar de/ });
  await expect(rejectedDialog).toContainText(/Disponible para retirar: \$\s70\.000/);
  await rejectedDialog.getByLabel('Monto').fill('80.000');
  await rejectedDialog.getByRole('button', { name: 'Registrar retiro' }).click();
  await expect(
    rejectedDialog.getByText('No puedes retirar más de lo que tienes ahorrado en esta meta.'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText(/\$\s70\.000 de \$\s1\.000\.000/)).toBeVisible();
});
