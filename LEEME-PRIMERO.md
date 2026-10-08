# Cómo empezar con GastoBot

Tomás, la inicialización local, las operaciones manuales y el ingreso por Telegram ya están implementados. El estado actual y los comandos verificados están en README.md. Conservamos este archivo como guía del paquete inicial.

## Secuencia original del paquete

1. Descomprimí el ZIP. La carpeta gastobot es la raíz de tu futuro proyecto.
2. Si ya creaste un repositorio vacío, copiá el CONTENIDO de gastobot a su raíz. Evitá gastobot/gastobot.
3. Abrí esa carpeta en tu entorno de Codex antes de iniciar la tarea.
4. Pegá el contenido de prompts/01-initialize.md.
5. La inicialización preparó Git en `main`, configuró el proyecto y verificó la base local.
6. La primera función implementó la creación manual siguiendo docs/features/create-expense.md.
7. Las instrucciones de planificación e implementación quedan como referencia de ese proceso.

Los archivos se colocan ANTES de la primera instrucción, para que Codex los pueda leer. Si Git ya existe, copiarlos simplemente los agrega al directorio de trabajo; después se revisan y se incluyen en un commit.

## Qué autoriza la primera instrucción

- Inicialización local del proyecto y de Git cuando corresponda.
- Configuración de dependencias, comandos, PostgreSQL local y CI.
- Una pantalla mínima para comprobar que Next.js funciona.
- Planificación de la creación de gastos.

La implementación de create-expense comienza en la siguiente tarea, después de revisar su plan. La primera instrucción no crea un repositorio remoto, no publica ni realiza envíos remotos.

## Decisiones de partida

- Next.js App Router, React, TypeScript estricto y npm.
- PostgreSQL, Prisma y Zod.
- CSS Modules/CSS para la interfaz inicial.
- Vitest para pruebas; Playwright cuando exista la primera interacción completa.
- Un único usuario local, ARS y America/Argentina/Buenos_Aires.
- Primero la web; después Telegram y el agente.
- Sin IA, integración financiera ni autenticación durante la inicialización.

Son decisiones de este proyecto, no requisitos universales de desarrollo web. Las versiones exactas y los comandos ejecutados están registrados en README.md.

## Mapa de lectura

| Archivo | Para qué sirve |
| --- | --- |
| AGENTS.md | Reglas cortas y operativas para Codex |
| README.md | Presentación y estado actual |
| docs/product.md | Problema, alcance, reglas y hoja de ruta |
| docs/architecture.md | Flujo de datos, límites y estructura objetivo |
| docs/development-methodology.md | Metodología de trabajo |
| docs/decisions/ | Motivos de las decisiones |
| docs/features/initialize-project.md | Criterios verificables de la inicialización |
| docs/features/create-expense.md | Primer incremento vertical |
| docs/features/telegram-expense-entry.md | Ingreso por Telegram |
| docs/telegram-bot-setup.md | Creación y configuración del bot |
| prompts/ | Instrucciones listas para pegar en Codex |
