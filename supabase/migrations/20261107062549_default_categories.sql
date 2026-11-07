-- Default system categories (user_id null), visible to every signed-in user.
-- Idempotent: the unique (user_id, name, type) constraint, with nulls not
-- distinct, makes `on conflict do nothing` skip rows that already exist.
-- Icons are lucide-react names in kebab-case (usable with <DynamicIcon name>).

insert into public.categories (user_id, name, icon, color, type)
values
  -- Expenses
  (null, 'Comida',          'utensils',        '#F97316', 'expense'),
  (null, 'Transporte',      'bus',             '#3B82F6', 'expense'),
  (null, 'Universidad',     'graduation-cap',  '#8B5CF6', 'expense'),
  (null, 'Hogar',           'house',           '#F59E0B', 'expense'),
  (null, 'Servicios',       'zap',             '#06B6D4', 'expense'),
  (null, 'Salud',           'heart-pulse',     '#EF4444', 'expense'),
  (null, 'Entretenimiento', 'popcorn',         '#EC4899', 'expense'),
  (null, 'Ropa',            'shirt',           '#14B8A6', 'expense'),
  (null, 'Otros',           'circle-ellipsis', '#6B7280', 'expense'),
  -- Income
  (null, 'Salario',         'briefcase',       '#16A34A', 'income'),
  (null, 'Mesada',          'hand-coins',      '#84CC16', 'income'),
  (null, 'Freelance',       'laptop',          '#0EA5E9', 'income'),
  (null, 'Otros',           'circle-ellipsis', '#6B7280', 'income')
on conflict do nothing;
