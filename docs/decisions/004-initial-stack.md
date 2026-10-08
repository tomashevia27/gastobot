# ADR 004 — Tecnologías iniciales

Estado: aceptada y verificada para la inicialización local.
Fecha: 2026-10-06.

## Contexto

Tomás conoce los fundamentos de programación y quiere aprender el recorrido web completo y, después, herramientas reales para agentes. Usar un lenguaje para la interfaz y el backend mantiene enfocadas las herramientas iniciales.

## Decisión

Usar:
- Next.js App Router y React para los puntos de entrada web y del backend.
- TypeScript estricto para el código de aplicación.
- npm con package-lock.json.
- PostgreSQL para registros relacionales persistentes.
- Prisma para acceso a la base y migraciones versionadas.
- Zod para validar datos externos.
- CSS Modules/CSS al inicio.
- Vitest para pruebas de dominio e integración.
- Playwright desde el primer recorrido completo de navegador.
- Docker Compose para PostgreSQL local.
- GitHub Actions para integración continua.

Usar Route Handlers para el primer límite de escritura HTTP; las funciones de aplicación siguen siendo reutilizables.
Versiones elegidas el 2026-10-06: Node.js 24.15.0, npm 11.12.1, Next.js 16.3.8, React 19.3.0, TypeScript 5.9.3, PostgreSQL 17.11, Prisma 7.10.0 con `@prisma/adapter-pg` y `pg`, Zod 4.6.5, Vitest 5.0.3 y ESLint 9.39.5. Las dependencias npm exactas están en `package.json` y el archivo de bloqueo. TypeScript 6 y ESLint 10 fallaron en la integración elegida con la compilación o el lint de Next durante la inicialización.

## Consecuencias

Una aplicación, un lenguaje para el código de funciones, persistencia SQL explícita y un flujo HTTP que se puede inspeccionar.
Hay un ORM que aprender. Se comprobó la compatibilidad de las versiones durante la inicialización; repetí esa comprobación al actualizar las tecnologías.
Es una elección educativa y del proyecto, no una afirmación de superioridad universal.
Todavía no se necesita un SDK de LLM, un framework de agentes ni un framework de componentes de interfaz.
