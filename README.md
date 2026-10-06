# GastoBot

Aplicación local para registrar gastos personales y aprender el recorrido interfaz → HTTP → aplicación → PostgreSQL. Hoy existe el bootstrap y una página de inicio; todavía no se pueden cargar gastos. La primera feature propuesta está en [create-expense](docs/features/create-expense.md).

## Requisitos y versiones

- Node.js **24.15.0** (`.nvmrc`; versión usada en la verificación), npm **11.12.1**.
- Docker **28.0.0** con Compose **5.1.3** para PostgreSQL **17.11**.
- Next.js **16.3.8**, React/React DOM **19.3.0**, TypeScript **5.9.3**.
- Prisma CLI, Client y adaptador PostgreSQL **7.10.0**; Zod **4.6.5**; Vitest **5.0.3**; ESLint **9.39.5**.

Las versiones npm están fijadas en `package.json` y `package-lock.json`. TypeScript 6 y ESLint 10 se probaron durante el bootstrap, pero el build de Next y el plugin React de su configuración de lint, respectivamente, fallaron con esas versiones. Se eligieron las versiones anteriores porque los checks completos funcionan con ellas. La configuración sigue la [guía de instalación de Next.js](https://nextjs.org/docs/app/getting-started/installation), su [guía de ESLint](https://nextjs.org/docs/app/api-reference/config/eslint) y la [guía de Prisma 7 con PostgreSQL](https://www.prisma.io/docs/v7/prisma-orm/quickstart/postgresql).

## Inicio local

Desde la raíz del proyecto:

```bash
nvm use                 # o activar Node 24.15.0 de otra manera
npm ci
cp .env.example .env    # solo si todavía no existe .env
docker compose up -d --wait
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). `.env` queda ignorado por Git. Las credenciales del ejemplo sirven solo para desarrollo local; PostgreSQL escucha en `127.0.0.1:5432`. Para parar el contenedor sin borrar los datos: `docker compose down`. El volumen `gastobot_postgres_data` persiste. No uses `docker compose down -v` si querés conservarlo.

La página de inicio no consulta PostgreSQL. Para comprobar la configuración Prisma: `npm run db:validate`. Todavía no hay modelos ni migraciones; la primera feature agregará el modelo, su migración y el cliente generado. El backend futuro usará `DATABASE_URL` del entorno, con el adaptador `@prisma/adapter-pg`.

## Verificaciones

```bash
npm run lint
npm run typecheck
npm run db:validate
npm run build
npm test
```

`npm test` ejecuta Vitest una vez. Hoy termina con código 1 y “No test files found”: no hay reglas de negocio implementadas ni cobertura. No existen aún `test:integration` ni `test:e2e`; se incorporan con la primera feature. CI ejecutará `npm ci`, lint, typecheck, validación de Prisma y build en push/PR a `main`. Omite explícitamente la suite vacía hasta que create-expense agregue tests obligatorios. La existencia del workflow no significa que GitHub lo haya ejecutado.

En el bootstrap del 2026-10-06 se verificaron `npm install`, `npm ci`, lint, typecheck, validación de schema, build, PostgreSQL 17.11 en estado healthy, conexión Prisma con `SELECT 1` y render de `/` con HTTP 200. El contenedor se detuvo con `docker compose down` y se confirmó que el volumen persiste. El build y las comprobaciones de red/socket necesitaron ejecutarse fuera del sandbox local. La auditoría npm informó **9 alertas altas** en dependencias transitivas de las herramientas ESLint/Prisma; las sugerencias automáticas implican cambiar de línea mayor. No se ejecutó `npm audit fix --force`.

## Alcance y documentación

Uso local de un único usuario, en ARS y zona `America/Argentina/Buenos_Aires`. No hay autenticación ni uso público previsto en esta etapa.

- [Producto](docs/product.md)
- [Arquitectura](docs/architecture.md)
- [Metodología](docs/development-methodology.md)
- [Decisiones](docs/decisions/001-modular-monolith.md)
- [Bootstrap](docs/features/initialize-project.md)
- [Primera feature](docs/features/create-expense.md)
- [Instrucciones para agentes](AGENTS.md)
