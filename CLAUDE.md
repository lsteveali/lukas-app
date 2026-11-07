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
- **Moneda:** pesos colombianos (COP). Se formatean con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` → `$ 15.000`. Usa siempre `formatCOP` / `parseCOP` de `src/lib/utils/money.ts`: el espacio tras `$` es un NBSP (U+00A0), así que en tests compara contra `formatCOP(...)` o usa ` `; `formatCOP` lanza `RangeError` con montos no enteros y `parseCOP` devuelve `null` si la entrada es ambigua.
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
7. **Los datos que deben existir en producción van en migraciones, no en `seed.sql`.** `supabase db push` no aplica `seed.sql` al remoto; ese archivo solo corre en local (`supabase db reset`) y sirve únicamente para datos de prueba.

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
│   │   ├── auth/
│   │   │   ├── callback/       # OAuth (Google): exchangeCodeForSession
│   │   │   └── confirm/        # confirmación de correo: verifyOtp con token_hash
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # componentes de shadcn/ui
│   │   ├── layout/AppNav.tsx   # navegación de (app): header en escritorio, barra inferior en celular
│   │   └── ...                 # componentes propios por feature (auth, transactions, dashboard)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # cliente de navegador
│   │   │   ├── server.ts       # cliente de servidor
│   │   │   ├── env.ts          # lee y valida las variables de Supabase
│   │   │   └── proxy.ts        # updateSession: refresco de sesión + redirecciones
│   │   ├── auth/
│   │   │   ├── errors.ts       # códigos de Supabase Auth → mensajes en español
│   │   │   └── routes.ts       # getAuthRedirect: rutas públicas y protegidas
│   │   ├── validations/        # esquemas zod
│   │   └── utils/
│   │       ├── money.ts        # formatCOP, parseCOP
│   │       ├── dates.ts
│   │       ├── origin.ts       # origen de la petición para URLs de redirección
│   │       └── redirect.ts     # safeNextPath: solo rutas internas
│   ├── types/
│   │   └── database.ts         # generado con `supabase gen types`
│   └── proxy.ts                # Next 16 (antes middleware.ts): sesión y protección de rutas
├── supabase/
│   ├── migrations/
│   ├── config.toml
│   └── seed.sql                # solo datos de prueba locales (no llega al remoto)
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
- `icon text` (nombre de icono de lucide-react en kebab-case, p. ej. `graduation-cap`; se usa con `<DynamicIcon name>`)
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
- `id`, `user_id`, `name text` (1–60), `target_amount bigint check (> 0)`, `deadline date`, `created_at`
- **Sin `current_amount`**: lo ahorrado es la suma de sus aportes. Único `(id, user_id)` para la FK compuesta de los aportes.

**goal_contributions** (v0.2)
- `id`, `goal_id`, `user_id`, `amount bigint check (amount <> 0)` (positivo = aporte, negativo = retiro), `date date` (por defecto hoy en Bogotá), `note text` (≤ 120), `created_at`
- FK compuesta `(goal_id, user_id) → goals (id, user_id) on delete cascade`: un aporte solo puede ser de una meta del mismo usuario.
- Trigger `check_goal_balance` (after insert/update/delete): bloquea la meta con `select … for update` y rechaza el cambio si la suma queda negativa (`23514`, mensaje `goal_balance_negative`). El `for update` necesita que `authenticated` tenga UPDATE en al menos una columna de `goals`.
- Solo se pueden actualizar `amount`, `date` y `note`.

**goals_with_progress** (vista, v0.2, `security_invoker = true`)
- Columnas de `goals` + `saved_amount bigint` (suma de aportes). En los tipos generados sale `number | null`: usa `?? 0`.

**budgets** (v0.2)
- `id`, `user_id`, `category_id`, `limit_amount bigint check (> 0)`, `month date check (extract(day from month) = 1)`, `created_at`
- Único: `(user_id, category_id, month)`. La categoría debe ser de gasto y visible para el usuario (igual que en `transactions`). Solo se puede actualizar `limit_amount`.

### Gastos compartidos (v0.3)

**groups**: `id`, `name text`, `created_by uuid FK`, `created_at`

**group_members**: `group_id FK`, `user_id FK`, `role text check (role in ('owner','member'))`, `joined_at`. PK compuesta `(group_id, user_id)`.

**shared_expenses**: `id`, `group_id FK`, `paid_by uuid FK`, `amount bigint`, `description text`, `date date`, `created_at`

**expense_splits**: `expense_id FK`, `user_id FK`, `amount bigint`. PK compuesta `(expense_id, user_id)`. La suma de los splits debe ser igual a `shared_expenses.amount`.

**settlements**: `id`, `group_id FK`, `from_user uuid`, `to_user uuid`, `amount bigint`, `date date`, `created_at`

### Políticas RLS (resumen)

- `profiles`, `transactions`, `goals`, `goal_contributions`, `budgets`: el usuario solo puede leer y escribir filas donde `user_id = auth.uid()`.
- `categories`: lectura de las filas con `user_id IS NULL` o `user_id = auth.uid()`; escritura solo de las propias.
- Tablas de grupos: acceso solo si el usuario es miembro del grupo. Usa una función `is_group_member(group_id)` con `security definer` para evitar recursión en las políticas.

---

## Roadmap

### v0.1: MVP ← **EMPEZAR AQUÍ**
- [x] Inicializar Next.js + TypeScript + Tailwind + ESLint + Prettier
- [x] Configurar shadcn/ui
- [x] Configurar clientes de Supabase (`@supabase/ssr`) y proxy de sesión
- [x] Migración inicial: `profiles` (con trigger), `categories`, `transactions` + RLS
- [x] Categorías predeterminadas en una **migración nueva** (no en `seed.sql`, que `db push` no aplica al remoto):
  - Gastos: Comida, Transporte, Universidad, Hogar, Servicios, Salud, Entretenimiento, Ropa, Otros
  - Ingresos: Salario, Mesada, Freelance, Otros
- [x] Autenticación: correo y contraseña + Google OAuth; páginas de login y registro
- [x] Protección de rutas con proxy (`src/proxy.ts`)
- [x] CRUD de transacciones (crear, listar con filtro por mes, editar, eliminar)
- [x] Dashboard: balance del mes (ingresos − gastos), gráfica de dona de gastos por categoría y últimos 5 movimientos
- [x] Utilidades `formatCOP` / `parseCOP` con tests
- [x] Workflow de CI (lint, typecheck, tests)
- [x] README con descripción, stack, setup local y capturas

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
npm run db:types     # regenera src/types/database.ts desde el proyecto vinculado
npm run db:push      # aplica las migraciones pendientes al proyecto vinculado (producción)
```

Los scripts usan el CLI de Supabase v3 vía `npx supabase@3.0.0` (no es dependencia del proyecto). Requieren `npx supabase login` y `npx supabase link` una vez por máquina. Sin Docker no hay stack local: prueba las migraciones antes de hacer `db:push`.

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
- Con `cacheComponents` activo, todo lo que lea datos de la petición (`cookies()`, `searchParams`, sesión) va dentro de `<Suspense>`.
- Los formularios con datos sensibles llevan `method="post"`, para que un envío antes de la hidratación nunca ponga la contraseña en la URL.
- Auth: la plantilla "Confirm signup" de Supabase apunta a `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` (ruta `/auth/confirm`). Las Redirect URLs deben terminar en `/**`.
- Rutas protegidas por defecto: todo exige sesión salvo `/`, `/login`, `/registro` y `/auth/*` (`src/lib/auth/routes.ts`). Una ruta pública nueva se agrega ahí, con su test.
- Toda redirección a un destino que venga de la URL (`next`) pasa por `safeNextPath`.
- Fechas: usa `src/lib/utils/dates.ts` (`todayInBogota`, `parseMonthParam`, `monthRange`…). Nunca `new Date().toISOString().slice(0, 10)` ni la fecha local del servidor, que en Vercel es UTC. Las fechas `YYYY-MM-DD` se formatean en UTC para no correrse un día.
- `update`/`delete` en Server Actions: con RLS, una fila ajena o inexistente no da error, solo afecta 0 filas. Encadena `.eq('user_id', userId).select('id')` y, si `data` llega vacío, devuelve "No se encontró…". Cada acción nueva lleva un test de ese caso.
- Toda mutación de transacciones revalida `/transacciones` y `/dashboard` (`revalidateMoneyPages` en `transacciones/actions.ts`). Si una página nueva muestra movimientos o totales, agrégala ahí.
- Totales y agrupaciones de dinero se calculan en el servidor con funciones puras y testeadas (`src/lib/finance/summary.ts`), siempre en enteros.
- La barra inferior del celular mide `--bottom-nav-height` (`globals.css`). Todo lo fijo abajo (botones flotantes) se desplaza con esa variable.
- Al agregar componentes con el CLI de shadcn: quita el paquete `cn` que instala y cambia `from "cn"` por `@/lib/utils/cn`. Los textos para lectores de pantalla van en español.

---

## Cómo trabajar en este repo (instrucciones para Claude)

1. Antes de implementar una tarea, revisa este archivo y el estado actual del código.
2. Trabaja de a una tarea del roadmap a la vez y propón el plan antes de escribir mucho código.
3. Al terminar una tarea, marca su casilla en el roadmap de este archivo.
4. Si una decisión no está cubierta aquí (una dependencia nueva, un cambio en el modelo de datos), pregunta antes de hacerla.
5. Después de cambios importantes, corre `lint`, `typecheck` y `test` antes de dar la tarea por terminada.
