# Instrucción 01 — Inicializar GastoBot

Trabajemos en GastoBot. Esta carpeta contiene la documentación inicial del proyecto.

Leé AGENTS.md, README.md, docs/product.md, docs/architecture.md,
docs/development-methodology.md, las decisiones de docs/decisions/ y
docs/features/initialize-project.md.

La idea es una aplicación de gastos personales: primero una web manual; después Telegram, un agente con herramientas, importaciones y conciliación. También quiero aprender el flujo interfaz → HTTP → aplicación → base de datos.

Te autorizo a inicializar el proyecto LOCAL descrito en initialize-project.md. Antes de modificar, inspeccioná archivos, estado de Git y herramientas disponibles, y explicá brevemente tu plan. Luego ejecutalo dentro de ese alcance.

Usá Next.js App Router, React, TypeScript estricto, npm, PostgreSQL, Prisma, Zod, CSS Modules/CSS y Vitest. Comprobá las versiones estables compatibles y su documentación; registrá las elegidas y conservá el archivo de bloqueo de dependencias.

Si esta carpeta no pertenece a un repositorio, inicializá Git con main. Si ya existe uno, respetalo; si detectás un repositorio padre, informalo antes de crear uno anidado. Conservá los documentos existentes. Si el generador del proyecto rechaza la carpeta por no estar vacía, generá temporalmente la estructura inicial y trasladá solo los archivos necesarios sin sobrescribir documentación ni arrastrar otro .git.

Configurá la base de src/app, PostgreSQL local con volumen persistente,
Prisma, .env.example, comandos de lint, tipos, pruebas y compilación, e integración continua. Seguí las responsabilidades de docs/architecture.md y creá carpetas cuando tengan contenido real. Mostrá una página mínima de GastoBot.

No implementes gastos ni integraciones todavía. No hagas commits, envíos remotos ni despliegues, y no crees un repositorio remoto.

Verificá instalación, lint, tipos, compilación y visualización. Comprobá PostgreSQL/Prisma si el entorno lo permite. Si todavía no hay pruebas, declaralo; no inventes una suite vacía que aparente cobertura. Reportá bloqueos reales sin ocultar errores.

Actualizá README.md y las instrucciones operativas con la configuración real. Al terminar, explicá los archivos creados, las versiones, las verificaciones y sus resultados.

Finalmente leé docs/features/create-expense.md y proponé su plan:
archivos a cambiar, flujo de datos, pruebas, decisiones y supuestos. Detenete antes de implementar esa función para que yo pueda revisar el plan.
