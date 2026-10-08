# GastoBot

Aplicación local para registrar gastos personales y aprender el recorrido interfaz → HTTP → aplicación → PostgreSQL. Ya se pueden crear, editar, eliminar y filtrar gastos manuales en ARS, y registrar gastos por comandos de Telegram. La lista tiene páginas de 20 registros y el resumen muestra el total del mes actual.

## Requisitos y versiones

- Node.js **24.15.0** (`.nvmrc`; versión usada en la verificación), npm **11.12.1**.
- Docker **28.0.0** con Compose **5.1.3** para PostgreSQL **17.11**.
- Next.js **16.3.8**, React/React DOM **19.3.0**, TypeScript **5.9.3**.
- `tsx` **4.23.13** para ejecutar el proceso local de Telegram.
- Prisma CLI, Client y adaptador PostgreSQL **7.10.0**; Zod **4.6.5**; Vitest **5.0.3**; ESLint **9.39.5**; Playwright **1.63.0**.

Las versiones npm están fijadas en `package.json` y `package-lock.json`. TypeScript 6 y ESLint 10 se probaron durante el bootstrap, pero el build de Next y el plugin React de su configuración de lint, respectivamente, fallaron con esas versiones. Se eligieron las versiones anteriores porque los checks completos funcionan con ellas. La configuración sigue la [guía de instalación de Next.js](https://nextjs.org/docs/app/getting-started/installation), su [guía de ESLint](https://nextjs.org/docs/app/api-reference/config/eslint) y la [guía de Prisma 7 con PostgreSQL](https://www.prisma.io/docs/v7/prisma-orm/quickstart/postgresql).

## Inicio local

Desde la raíz del proyecto:

```bash
nvm use                 # o activar Node 24.15.0 de otra manera
npm run local
```

`npm run local` instala dependencias si faltan o no coinciden, crea `.env` desde el ejemplo solo si no existe, levanta PostgreSQL, genera el cliente Prisma, aplica las migraciones existentes y arranca Next.js. No reemplaza `.env` ni borra datos. Abrí [http://localhost:3000](http://localhost:3000). `.env` queda ignorado por Git. Las credenciales del ejemplo sirven solo para desarrollo local; PostgreSQL escucha en `127.0.0.1:5432`. Para detener Next.js usá `Ctrl+C`; para parar PostgreSQL sin borrar los datos: `docker compose down`. El volumen `gastobot_postgres_data` persiste. No uses `docker compose down -v` si querés conservarlo.

## Telegram v0.2

Seguí la [guía para crear y configurar el bot](docs/telegram-bot-setup.md). Una vez completado `TELEGRAM_BOT_TOKEN` y `TELEGRAM_ALLOWED_USER_ID` en `.env`, mantené `npm run local` en una terminal y ejecutá `npm run telegram` en otra. El proceso usa polling local, no expone la web a Internet y solo acepta tu chat privado. `/ayuda` muestra los comandos y valores válidos. La [especificación](docs/features/telegram-expense-entry.md) detalla el comportamiento y [ADR 005](docs/decisions/005-telegram-local-polling.md) registra las decisiones de entrega e idempotencia.

Las migraciones crean `expenses` y el registro de actualizaciones procesadas de Telegram. Los montos son `BIGINT` con una restricción de rango en PostgreSQL. El formulario envía solo campos editables a `POST /api/expenses` (201); `PUT /api/expenses/{id}` reemplaza esos campos y `DELETE /api/expenses/{id}` elimina el registro tras confirmación en la interfaz. `GET /api/expenses` acepta `month=AAAA-MM`, `category` y `page`; devuelve gastos ordenados, `totalCount`, `hasMore`, `page`, `month` y `currentMonthTotalCents`. Los filtros afectan la lista; el total siempre corresponde al mes actual completo. Los totales viajan como strings de centavos para evitar problemas de serialización de `bigint`.

## Verificaciones

```bash
npm run lint
npm run typecheck
npm run db:validate
npm run db:generate
npm test
npm run test:integration
npm run test:e2e
npm run build
```

`npm test` ejecuta una sola vez los tests de dominio. Para integración y navegador, primero prepará la base aislada:

```bash
cp .env.test.example .env.test    # solo si todavía no existe
docker compose --profile test up -d --wait postgres-test
npm run db:test:migrate
npm run test:integration
npx playwright install chromium   # una vez por equipo
npm run test:e2e
```

`postgres-test` usa el puerto `127.0.0.1:5433` y almacenamiento temporal. Los comandos de test requieren `TEST_DATABASE_URL` y verifican el nombre `gastobot_test`; cada prueba borra solo sus propios registros. El contenedor de test se puede detener con `docker compose --profile test stop postgres-test`. Nunca apuntes estos comandos a la base de desarrollo.

CI ejecuta instalación, generación Prisma, lint, typecheck, tests unitarios, migración/test de integración, build y navegador en push/PR a `main`. La existencia del workflow no significa que GitHub lo haya ejecutado.

En el bootstrap del 2026-10-06 se verificaron `npm install`, `npm ci`, lint, typecheck, validación de schema, build, PostgreSQL 17.11 en estado healthy, conexión Prisma con `SELECT 1` y render de `/` con HTTP 200. La auditoría npm informó **9 alertas altas** en dependencias transitivas de las herramientas ESLint/Prisma; las sugerencias automáticas implican cambiar de línea mayor. No se ejecutó `npm audit fix --force`.

En la primera feature se comprobaron 39 tests de dominio, 5 de integración con PostgreSQL y 2 de navegador. La migración se aplicó en desarrollo y en `gastobot_test`; `npm ci`, lint, tipos, validación Prisma y build pasaron. Un gasto sintético siguió visible tras detener y reiniciar el servidor de producción y se borró luego de `gastobot_test`.

Con edición, eliminación y filtros se verificaron 52 tests de dominio, 11 de integración y 6 de navegador, además de lint, typecheck y build. Estas comprobaciones se ejecutaron localmente con `gastobot_test`; CI todavía no se ejecutó remotamente.

En v0.2 se verificaron 66 tests unitarios, 17 de integración con `gastobot_test`, 6 de navegador, lint, typecheck, validación Prisma y build. También se comprobó que ambos comandos de Telegram informan la configuración faltante sin exponer credenciales. No se ejecutó una prueba con un bot real porque todavía no hay token ni ID configurados en este entorno; la guía describe esa comprobación manual. El primer intento de build dentro del sandbox falló en un subproceso de TypeScript; el build fuera del sandbox terminó correctamente.

## Alcance y documentación

Uso local de un único usuario, en ARS y zona `America/Argentina/Buenos_Aires`. No hay autenticación ni uso público previsto en esta etapa.

- [Producto](docs/product.md)
- [Arquitectura](docs/architecture.md)
- [Metodología](docs/development-methodology.md)
- [Decisiones](docs/decisions/001-modular-monolith.md)
- [Bootstrap](docs/features/initialize-project.md)
- [Primera feature](docs/features/create-expense.md)
- [Editar gasto](docs/features/edit-expense.md)
- [Eliminar gasto](docs/features/delete-expense.md)
- [Filtrar gastos](docs/features/filter-expenses.md)
- [Ingreso por Telegram](docs/features/telegram-expense-entry.md)
- [Crear y configurar el bot](docs/telegram-bot-setup.md)
- [Instrucciones para agentes](AGENTS.md)
