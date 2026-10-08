# GastoBot

Aplicación local para registrar gastos personales y aprender el recorrido interfaz → HTTP → aplicación → PostgreSQL. Ya se pueden crear y editar gastos manuales en ARS, verlos en una lista y consultar el total del mes actual. Los contratos están en [create-expense](docs/features/create-expense.md) y [edit-expense](docs/features/edit-expense.md).

## Requisitos y versiones

- Node.js **24.15.0** (`.nvmrc`; versión usada en la verificación), npm **11.12.1**.
- Docker **28.0.0** con Compose **5.1.3** para PostgreSQL **17.11**.
- Next.js **16.3.8**, React/React DOM **19.3.0**, TypeScript **5.9.3**.
- Prisma CLI, Client y adaptador PostgreSQL **7.10.0**; Zod **4.6.5**; Vitest **5.0.3**; ESLint **9.39.5**; Playwright **1.63.0**.

Las versiones npm están fijadas en `package.json` y `package-lock.json`. TypeScript 6 y ESLint 10 se probaron durante el bootstrap, pero el build de Next y el plugin React de su configuración de lint, respectivamente, fallaron con esas versiones. Se eligieron las versiones anteriores porque los checks completos funcionan con ellas. La configuración sigue la [guía de instalación de Next.js](https://nextjs.org/docs/app/getting-started/installation), su [guía de ESLint](https://nextjs.org/docs/app/api-reference/config/eslint) y la [guía de Prisma 7 con PostgreSQL](https://www.prisma.io/docs/v7/prisma-orm/quickstart/postgresql).

## Inicio local

Desde la raíz del proyecto:

```bash
nvm use                 # o activar Node 24.15.0 de otra manera
npm run local
```

`npm run local` instala dependencias si faltan o no coinciden, crea `.env` desde el ejemplo solo si no existe, levanta PostgreSQL, genera el cliente Prisma, aplica las migraciones existentes y arranca Next.js. No reemplaza `.env` ni borra datos. Abrí [http://localhost:3000](http://localhost:3000). `.env` queda ignorado por Git. Las credenciales del ejemplo sirven solo para desarrollo local; PostgreSQL escucha en `127.0.0.1:5432`. Para detener Next.js usá `Ctrl+C`; para parar PostgreSQL sin borrar los datos: `docker compose down`. El volumen `gastobot_postgres_data` persiste. No uses `docker compose down -v` si querés conservarlo.

La migración crea `expenses` de forma aditiva, con montos `BIGINT` y una restricción de rango en PostgreSQL. El formulario envía solo campos editables a `POST /api/expenses`; la respuesta exitosa es 201 y el gasto persistido. `PUT /api/expenses/{id}` reemplaza los campos editables. `GET /api/expenses` devuelve `{ expenses, month, currentMonthTotalCents }`. El total viaja como string de centavos para evitar problemas de serialización de `bigint`.

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

En la primera feature se comprobaron 39 tests de dominio, 5 de integración con PostgreSQL y 2 de navegador. La migración se aplicó en desarrollo y en `gastobot_test`; `npm ci`, lint, tipos, validación Prisma y build pasaron. Un gasto sintético siguió visible tras detener y reiniciar el servidor de producción y se borró luego de `gastobot_test`. El workflow de GitHub aún no se ejecutó remotamente.

## Alcance y documentación

Uso local de un único usuario, en ARS y zona `America/Argentina/Buenos_Aires`. No hay autenticación ni uso público previsto en esta etapa.

- [Producto](docs/product.md)
- [Arquitectura](docs/architecture.md)
- [Metodología](docs/development-methodology.md)
- [Decisiones](docs/decisions/001-modular-monolith.md)
- [Bootstrap](docs/features/initialize-project.md)
- [Primera feature](docs/features/create-expense.md)
- [Instrucciones para agentes](AGENTS.md)
