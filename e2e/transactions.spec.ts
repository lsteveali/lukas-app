import { expect, loginAs, openDialog, selectOption, test } from './fixtures';

test('crear, editar y eliminar un movimiento', async ({ page, testUser }) => {
  await loginAs(page, testUser, '/transacciones');
  await expect(page.getByText(/No hay movimientos en/)).toBeVisible();

  // Create: on phones there is also a floating button with the same name.
  const createDialog = await openDialog(
    page,
    page.getByRole('button', { name: 'Nuevo movimiento' }).first(),
    'Nuevo movimiento',
  );
  await createDialog.getByLabel('Monto').fill('15.000');
  await selectOption(page, 'Categoría', 'Comida');
  await createDialog.getByLabel('Descripción (opcional)').fill('Almuerzo');
  await createDialog.getByRole('button', { name: 'Guardar movimiento' }).click();
  await expect(createDialog).toBeHidden();

  const row = page.getByRole('button', { name: /^Editar Comida, .* gasto de \$\s15\.000$/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Almuerzo');

  // Edit the amount.
  const editDialog = await openDialog(page, row, 'Editar movimiento');
  await editDialog.getByLabel('Monto').fill('20.000');
  await editDialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(editDialog).toBeHidden();
  const editedRow = page.getByRole('button', { name: /gasto de \$\s20\.000$/ });
  await expect(editedRow).toBeVisible();

  // Delete with confirmation.
  const deleteDialog = await openDialog(page, editedRow, 'Editar movimiento');
  await deleteDialog.getByRole('button', { name: 'Eliminar' }).click();
  const confirm = page.getByRole('alertdialog', { name: '¿Eliminar este movimiento?' });
  await expect(confirm).toContainText(/Gasto de \$\s20\.000/);
  await confirm.getByRole('button', { name: 'Eliminar' }).click();

  await expect(page.getByText(/No hay movimientos en/)).toBeVisible();
});
