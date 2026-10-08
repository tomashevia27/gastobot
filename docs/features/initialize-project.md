# Función — Inicializar el proyecto local

## Objetivo

Convertir la documentación entregada en una base de desarrollo ejecutable y verificable sin implementar todavía el comportamiento de gastos.

## Alcance

- Inspeccionar los archivos existentes, el estado de Git y las versiones instaladas de Node.js, npm y Docker.
- Inicializar Git con main solo si este directorio no pertenece ya a un repositorio.
- Si pertenece a un repositorio antecesor, informar la situación en lugar de crear uno anidado en silencio.
- Crear una aplicación Next.js App Router con src/, TypeScript estricto y npm.
- Conservar la documentación entregada. Como la raíz del proyecto no está vacía, podría ser necesario generar la estructura inicial en un directorio temporal.
- Agregar una página mínima de GastoBot en español, sin datos financieros simulados.
- Configurar ESLint y comandos de verificación de tipos, compilación y una sola ejecución de Vitest.
- Agregar configuración de PostgreSQL con Compose, puerto limitado a la interfaz local y volumen persistente con nombre.
- Configurar Prisma de manera compatible con la versión elegida; todavía no inventar tablas de gastos.
- Agregar un .env.example sin secretos e ignorar archivos reales de entorno, compilación y dependencias.
- Registrar una versión exacta y compatible de Node.js y conservar el archivo de bloqueo de dependencias.
- Configurar GitHub Actions para push y solicitudes de cambio a main, con versiones compatibles y npm ci.
- Actualizar README con comandos, configuración y verificaciones realmente realizadas.
- Terminar con un plan para create-expense, sin implementarlo.

## Fuera de alcance

No se incluyen operaciones de creación, lectura, edición o eliminación de gastos, datos de ejemplo, agente, Telegram, Mercado Pago, OAuth, autenticación, despliegue público, creación de repositorio remoto ni push.

## Criterios de aceptación

1. La documentación existente se conserva intacta salvo actualizaciones necesarias y explicadas de coherencia o configuración.
2. El servidor de desarrollo muestra una página mínima en localhost.
3. Lint, verificación de tipos y compilación se ejecutan correctamente, o se informan con claridad los bloqueos reales.
4. Existe un comando para ejecutar Vitest una sola vez. Si todavía no hay pruebas, se declara explícitamente; no se agrega una prueba tautológica ni se habilita permanentemente passWithNoTests para aparentar éxito.
5. La integración continua ejecuta los controles disponibles de lint, tipos y compilación. Durante la inicialización puede omitir explícitamente la suite vacía; la primera función agrega pruebas obligatorias y elimina esa omisión.
6. PostgreSQL usa un volumen con nombre y un puerto limitado a la interfaz local; README explica cómo iniciarlo y detenerlo sin borrar el volumen.
7. Se comprueba el inicio y disponibilidad de PostgreSQL si Docker está disponible. En caso contrario, se distingue la configuración entregada de una ejecución verificada.
8. No se crea una migración de negocio. Se comprueban la configuración y validación de Prisma con la versión instalada cuando sea posible.
9. Se conservan una versión compatible del entorno de ejecución y package-lock.json.
10. No se incluyen tokens ni datos financieros personales reales.
11. El informe final enumera cambios, controles y resultados exactos, versiones, limitaciones y plan para la primera función.
12. No se implementan funciones ni se realizan operaciones remotas o commits fuera de lo autorizado por la instrucción.

## Contrato de comandos

Configurar:
- npm run dev
- npm run lint
- npm run typecheck
- npm test
- npm run build

Agregar comandos de base y herramientas solo si son válidos para las versiones elegidas y hacen falta en esta etapa.
Los comandos de integración y extremo a extremo se crean con la primera función, no como marcadores vacíos que aparenten éxito.

## Notas de verificación

La compilación y la visualización no deben depender de descargar fuentes externas ni de una conexión a la base durante la compilación.
La preparación de la base de desarrollo es distinta de la preparación de pruebas.
La ausencia de una dependencia o herramienta es un bloqueo que debe informarse, no evidencia de que un control pasó.
