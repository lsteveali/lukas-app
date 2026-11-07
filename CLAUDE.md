# Lukas — Contexto del proyecto para Claude Code

## Qué es Lukas

Lukas es una app web (PWA) de **finanzas personales y gastos compartidos** para estudiantes y jóvenes en Colombia. El nombre viene de "lucas", la forma coloquial de decir "mil pesos".

Permite:
1. Registrar gastos e ingresos por categoría y ver un resumen mensual.
2. Definir metas de ahorro y presupuestos por categoría.
3. Crear grupos (apartamento, salidas, viajes), dividir gastos y saber quién le debe a quién.

Es un proyecto personal, desarrollado por una sola persona y gestionado en GitHub.

---

## Reglas de idioma

- **Código en inglés:** variables, funciones, componentes, tablas, columnas, commits y nombres de ramas.
- **Interfaz en español (Colombia):** todos los textos visibles para el usuario.
- **Moneda:** pesos colombianos (COP). Se formatean con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` → `$ 15.000`.
- **Fechas:** formato `es-CO`, zona horaria `America/Bogota`.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js (última versión estable, App Router) + TypeScript (modo `strict`) |
| Estilos | Tailwind CSS + shadcn/ui |
| Backend / BD | Supabase (PostgreSQL, Auth, Storage) |
| Cliente Supabase | `@supabase/ssr` (clientes separados para servidor y navegador) |
| Formularios | react-hook-form + zod |
| Gráficas | Recharts |
| Tests | Vitest (unitarios) · Playwright (e2e, a partir de v0.2) |
| Calidad | ESLint + Prettier |
| CI/CD | GitHub Actions + Vercel |
| Gestor de paquetes | npm |

Antes de agregar una dependencia que no esté en esta lista, pregunta.

---

## Reglas críticas (no negociables)

1. **El dinero se guarda como entero.** Todas las columnas de montos son `bigint` en pesos y en TypeScript se manejan como `number` entero. Nunca uses `float`, `real` ni `numeric` con decimales para dinero.
2. **Row Level Security activado en TODAS las tablas** desde la migración que las crea. Ninguna tabla queda sin políticas.
3. **Nunca subas secretos.** Las claves van en `.env.local` (ignorado por git), y `.env.example` lleva solo los nombres de las variables.
4. **La `service_role` key de Supabase nunca se usa en el cliente** ni en código que llegue al navegador.
5. **Valida en el servidor.** Toda entrada pasa por un esquema zod en Server Actions o Route Handlers, aunque también se valide en el formulario.
6. **El esquema de BD solo cambia mediante migraciones** en `supabase/migrations/`. Nada de cambios manuales en el dashboard.

---

## Estructura del proyecto

```
lukas-app/
├── .github/
│   └── workflows/ci.yml        # lint + typecheck + tests en cada PR
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── registro/
│   │   ├── (app)/              # rutas protegidas (requieren sesión)
│   │   │   ├── dashboard/
│   │   │   ├── transacciones/
│   │   │   ├── metas/          # v0.2
│   │   │   └── grupos/         # v0.3
│   │   ├── auth/callback/      # callback de OAuth
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # componentes de shadcn/ui
│   │   └── ...                 # componentes propios por feature
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # cliente de navegador
│   │   │   ├── server.ts       # cliente de servidor
│   │   │   ├── env.ts          # lee y valida las variables de Supabase
│   │   │   └── proxy.ts        # updateSession: refresco de sesión
│   │   ├── validations/        # esquemas zod
│   │   └── utils/
│   │       ├── money.ts        # formatCOP, parseCOP
│   │       └── dates.ts
│   ├── types/
│   │   └── database.ts         # generado con `supabase gen types`
│   └── proxy.ts                # Next 16 (antes middleware.ts): sesión y protección de rutas
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── .env.example
├── CLAUDE.md
└── README.md
```

Las rutas de la URL van en español porque el usuario las ve (`/transacciones`, `/metas`). Los nombres de archivos y componentes internos van en inglés (`TransactionForm.tsx`).

---

## Modelo de datos

### Usuarios y finanzas personales (v0.1 y v0.2)

**profiles**: se crea automáticamente con un trigger cuando se registra un usuario en `auth.users`.
- `id uuid PK` (= `auth.users.id`)
- `full_name text`
- `avatar_url text`
- `created_at timestamptz default now()`

**categories**
- `id uuid PK default gen_random_uuid()`
- `user_id uuid FK → profiles.id` (nullable: `NULL` = categoría predeterminada del sistema)
- `name text not null`
- `icon text` (nombre de icono de lucide-react)
- `color text` (hex)
- `type text check (type in ('expense','income'))`
- `created_at timestamptz default now()`

**transactions**
- `id uuid PK`
- `user_id uuid FK → profiles.id not null`
- `category_id uuid FK → categories.id`
- `type text check (type in ('expense','income')) not null`
- `amount bigint not null check (amount > 0)`
- `date date not null default current_date`
- `description text`
- `created_at timestamptz default now()`
- Índice: `(user_id, date desc)`

**goals** (v0.2)
- `id`, `user_id`, `name text`, `target_amount bigint`, `current_amount bigint default 0`, `deadline date`, `created_at`

**budgets** (v0.2)
- `id`, `user_id`, `category_id`, `limit_amount bigint`, `month date` (siempre el día 1 del mes)
- Único: `(user_id, category_id, month)`

### Gastos compartidos (v0.3)

**groups**: `id`, `name text`, `created_by uuid FK`, `created_at`

**group_members**: `group_id FK`, `user_id FK`, `role text check (role in ('owner','member'))`, `joined_at`. PK compuesta `(group_id, user_id)`.

**shared_expenses**: `id`, `group_id FK`, `paid_by uuid FK`, `amount bigint`, `description text`, `date date`, `created_at`

**expense_splits**: `expense_id FK`, `user_id FK`, `amount bigint`. PK compuesta `(expense_id, user_id)`. La suma de los splits debe ser igual a `shared_expenses.amount`.

**settlements**: `id`, `group_id FK`, `from_user uuid`, `to_user uuid`, `amount bigint`, `date date`, `created_at`

### Políticas RLS (resumen)

- `profiles`, `transactions`, `goals`, `budgets`: el usuario solo puede leer y escribir filas donde `user_id = auth.uid()`.
- `categories`: lectura de las filas con `user_id IS NULL` o `user_id = auth.uid()`; escritura solo de las propias.
- Tablas de grupos: acceso solo si el usuario es miembro del grupo. Usa una función `is_group_member(group_id)` con `security definer` para evitar recursión en las políticas.

---

## Roadmap

### v0.1: MVP ← **EMPEZAR AQUÍ**
- [x] Inicializar Next.js + TypeScript + Tailwind + ESLint + Prettier
- [x] Configurar shadcn/ui
- [x] Configurar clientes de Supabase (`@supabase/ssr`) y proxy de sesión
- [ ] Migración inicial: `profiles` (con trigger), `categories`, `transactions` + RLS
- [ ] `seed.sql` con categorías predeterminadas:
  - Gastos: Comida, Transporte, Universidad, Hogar, Servicios, Salud, Entretenimiento, Ropa, Otros
  - Ingresos: Salario, Mesada, Freelance, Otros
- [ ] Autenticación: correo y contraseña + Google OAuth; páginas de login y registro
- [ ] Protección de rutas con proxy (`src/proxy.ts`)
- [ ] CRUD de transacciones (crear, listar con filtro por mes, editar, eliminar)
- [ ] Dashboard: balance del mes (ingresos − gastos), gráfica de dona de gastos por categoría y últimos 5 movimientos
- [ ] Utilidades `formatCOP` / `parseCOP` con tests
- [x] Workflow de CI (lint, typecheck, tests)
- [ ] README con descripción, stack, setup local y capturas

### v0.2: Metas y presupuestos
- Metas de ahorro con barra de progreso y aportes
- Presupuesto mensual por categoría con alerta al llegar al 80 % y al 100 %
- Tests e2e de los flujos principales

### v0.3: Gastos compartidos
- Crear grupos e invitar miembros (por enlace o correo)
- Registrar un gasto compartido con división igual o personalizada
- Cálculo de balances simplificado (minimizar el número de transferencias)
- Registrar pagos (settlements)

### v0.4: Extras
- Escaneo de facturas con IA (foto → monto, fecha y categoría sugerida)
- PWA instalable
- Exportar a CSV
- Modo oscuro

---

## Flujo de trabajo con Git

- `main` siempre debe estar desplegable. Nada se sube directo a `main`.
- Una rama por issue: `feature/<issue>-descripcion-corta`, `fix/...`, `chore/...`
  - Ejemplo: `feature/5-transactions-crud`
- Commits convencionales en inglés:
  - `feat: add transaction form`
  - `fix: correct monthly balance calculation`
  - `chore: configure eslint`
  - `docs: update readme setup steps`
  - `test: add formatCOP tests`
- Cada rama se integra con un Pull Request que referencia su issue (`Closes #5`).
- Commits pequeños y enfocados: uno por cambio lógico.

---

## Comandos

```bash
npm run dev          # servidor de desarrollo
npm run build        # build de producción
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

Si alguno de estos scripts no existe todavía en `package.json`, créalo.

---

## Convenciones de código

- Server Components por defecto; `"use client"` solo cuando haga falta (interactividad, hooks).
- Las mutaciones van en **Server Actions**, en archivos `actions.ts` junto a la ruta.
- Después de una mutación, usa `revalidatePath` en lugar de recargar a mano.
- Componentes en PascalCase y utilidades en camelCase.
- Nada de `any`. Los tipos de BD salen de `src/types/database.ts`.
- Mensajes de error claros y en español para el usuario; logs técnicos en inglés.
- Diseño mobile-first: la mayoría de usuarios entrará desde el celular.

---

## Cómo trabajar en este repo (instrucciones para Claude)

1. Antes de implementar una tarea, revisa este archivo y el estado actual del código.
2. Trabaja de a una tarea del roadmap a la vez y propón el plan antes de escribir mucho código.
3. Al terminar una tarea, marca su casilla en el roadmap de este archivo.
4. Si una decisión no está cubierta aquí (una dependencia nueva, un cambio en el modelo de datos), pregunta antes de hacerla.
5. Después de cambios importantes, corre `lint`, `typecheck` y `test` antes de dar la tarea por terminada.
