# Cómo empezar con GastoBot

Tomás, la inicialización local y la primera función de creación manual ya están implementadas. El estado actual y los comandos verificados están en README.md. Conservamos este archivo como guía del paquete inicial.

## Secuencia original del paquete

1. Descomprimí el ZIP. La carpeta gastobot es la raíz de tu futuro proyecto.
2. Si ya creaste un repositorio vacío, copiá el CONTENIDO de gastobot a su raíz. Evitá gastobot/gastobot.
3. Abrí esa carpeta en tu entorno de Codex antes de iniciar la tarea.
4. Pegá el contenido de prompts/01-initialize.md.
5. El bootstrap inicializó Git en `main`, configuró el proyecto y verificó la base local.
6. La primera feature implementó la creación manual siguiendo docs/features/create-expense.md.
7. Los prompts de planificación e implementación quedan como referencia de ese proceso.

Los archivos se colocan ANTES del primer prompt, para que Codex los pueda leer. Si Git ya existe, copiarlos simplemente los agrega al directorio de trabajo; después se revisan y se incluyen en un commit.

## Qué autoriza el primer prompt

- Inicialización local del proyecto y de Git cuando corresponda.
- Configuración de dependencias, comandos, PostgreSQL local y CI.
- Una pantalla mínima para comprobar que Next.js funciona.
- Planificación de create-expense.

La implementación de create-expense comienza en la siguiente tarea, después de revisar su plan. El primer prompt no crea un repositorio remoto, no publica ni hace push.

## Decisiones de partida

- Next.js App Router, React, TypeScript strict y npm.
- PostgreSQL, Prisma y Zod.
- CSS Modules/CSS para la interfaz inicial.
- Vitest para tests; Playwright cuando exista la primera interacción completa.
- Un único usuario local, ARS y America/Argentina/Buenos_Aires.
- Primero web; después Telegram y el agente.
- Sin IA, integración financiera ni autenticación en el bootstrap.

Son decisiones de este proyecto, no requisitos universales de desarrollo web. Las versiones exactas y los comandos ejecutados están registrados en README.md.

## Mapa de lectura

| Archivo | Para qué sirve |
| --- | --- |
| AGENTS.md | Reglas cortas y operativas para Codex |
| README.md | Presentación y estado actual |
| docs/product.md | Problema, alcance, reglas y roadmap |
| docs/architecture.md | Flujo de datos, límites y estructura objetivo |
| docs/development-methodology.md | Metodología de trabajo |
| docs/decisions/ | Motivos de las decisiones |
| docs/features/initialize-project.md | Criterios verificables del bootstrap |
| docs/features/create-expense.md | Primera vertical slice |
| prompts/ | Pedidos listos para pegar en Codex |
