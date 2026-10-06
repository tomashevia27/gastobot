Trabajemos en GastoBot. Esta carpeta contiene la documentación inicial del proyecto.

Leé AGENTS.md, README.md, docs/product.md, docs/architecture.md,
docs/development-methodology.md, los ADRs de docs/decisions/ y
docs/features/initialize-project.md.

La idea es una aplicación de gastos personales: primero una web manual; después Telegram, un agente con tools, importaciones y conciliación. También quiero aprender el flujo frontend → HTTP → aplicación → base de datos.

Te autorizo a inicializar el proyecto LOCAL descrito en initialize-project.md. Antes de modificar, inspeccioná archivos, estado de Git y herramientas disponibles, y explicá brevemente tu plan. Luego ejecutalo dentro de ese alcance.

Usá Next.js App Router, React, TypeScript strict, npm, PostgreSQL, Prisma, Zod, CSS Modules/CSS y Vitest. Comprobá las versiones estables compatibles y su documentación; registrá las elegidas y conservá el lockfile.

Si esta carpeta no pertenece a un repositorio, inicializá Git con main. Si ya existe uno, respetalo; si detectás un repositorio padre, informalo antes de crear uno anidado. Conservá los documentos existentes. Si el scaffolder rechaza la carpeta por no estar vacía, generá temporalmente la base y trasladá sólo los archivos necesarios sin sobrescribir documentación ni arrastrar otro .git.

Configurá la base de src/app, PostgreSQL local con volumen persistente,
Prisma, .env.example, scripts de lint/typecheck/test/build y CI. Seguí las responsabilidades de docs/architecture.md y creá carpetas cuando tengan contenido real. Mostrá una página mínima de GastoBot.

No implementes gastos ni integraciones todavía. No hagas commit, push ni despliegue ni crees un repositorio remoto.

Verificá instalación, lint, typecheck, build y renderizado. Comprobá PostgreSQL/Prisma si el entorno lo permite. Si no hay tests todavía, declaralo; no inventes una suite vacía que aparente cobertura. Reportá bloqueos reales sin ocultar errores.

Actualizá README.md y las instrucciones operativas con el setup real. Al terminar, explicá los archivos creados, las versiones, las verificaciones y sus resultados.

Finalmente leé docs/features/create-expense.md y proponé su plan:
archivos a cambiar, flujo de datos, tests, decisiones y supuestos. Detenete antes de implementar esa feature para que yo pueda revisar el plan.
