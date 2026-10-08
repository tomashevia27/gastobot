# GastoBot — Arquitectura

## Estado

El flujo local de gastos manuales permite crear, editar, eliminar y consultar una lista filtrada y paginada. El resumen del mes actual es independiente de los filtros de la lista. La v0.2 agrega un adaptador local de Telegram para crear gastos mediante comandos.

## Sistema inicial

Una aplicación Next.js sirve la interfaz y el backend. PostgreSQL guarda los registros. No hay microservicios ni servidores de API desplegados por separado.

~~~mermaid
flowchart TD
    UI["Formulario web y lista de gastos"] --> HTTP["Manejadores de rutas de Next.js"]
    HTTP --> App["Operaciones de aplicación de gastos"]
    App --> Domain["Reglas puras de validación y dinero"]
    App --> Store["Persistencia PostgreSQL mediante Prisma"]
    Store --> DB["PostgreSQL"]
~~~

Las flechas muestran llamadas y dependencias de la implementación inicial. El código de dominio y validación no depende del adaptador de almacenamiento. El acceso a la base es infraestructura invocada por el código de aplicación.

## Telegram v0.2

~~~mermaid
flowchart TD
    Telegram["API de bots de Telegram"] --> Poller["Proceso local getUpdates"]
    Poller --> Guard["Verificación de chat privado y usuario autorizado"]
    Guard --> Parser["Análisis del comando determinista"]
    Parser --> Create["Operación de creación del gasto"]
    Create --> Rules["Validación compartida del gasto"]
    Create --> Tx["Transacción Prisma"]
    Tx --> Expense["expenses: origen TELEGRAM"]
    Tx --> Update["telegram_processed_updates: clave de bot y actualización"]
    Poller --> Reply["sendMessage después de procesar"]
~~~

`scripts/telegram-poll.ts` carga la configuración local e inicia el ciclo. `src/modules/telegram/client.ts` adapta la API HTTP de Telegram, `command.ts` analiza la sintaxis limitada, `processor.ts` autoriza y procesa una actualización, y `poller.ts` avanza el desplazamiento (`offset`) solo después de procesar y responder. El adaptador de Telegram llama a la misma validación de aplicación que usa la ruta web. PostgreSQL tiene una clave única `(bot_id, update_id)`; la creación del gasto y el registro de esa clave son atómicos. Al borrar un gasto, el `expense_id` de la actualización queda nulo y la clave se conserva, por lo que un reintento no lo recrea. Una respuesta puede repetirse después de una falla de red ambigua.

El token del bot nunca llega al código del cliente. La web sigue limitada al uso local y no tiene autenticación pública. Para usar Telegram debe estar activo un proceso Node separado. Consultá [ADR 005](decisions/005-telegram-local-polling.md) y la [guía de configuración](telegram-bot-setup.md).

### Flujo guiado especificado

La mejora pendiente de v0.2 agrega una máquina de estados al adaptador de Telegram para implementar `/registrar_gasto`. El estado del borrador vive en memoria durante un máximo absoluto de diez minutos y no sobrevive al reinicio del proceso. Por lo tanto, no requiere una tabla de sesiones ni una migración. La [especificación del registro guiado](features/telegram-guided-expense-entry.md) define sus estados, transiciones, botones, correcciones y criterios de aceptación.

El cliente de Telegram deberá admitir actualizaciones `callback_query`, teclados en línea y respuestas a callbacks. Las transiciones reúnen los campos sin persistirlos; confirmar llama a la misma operación de creación validada que usa `/gasto`. La persistencia final conserva la deduplicación transaccional por actualización de Telegram.

## Tecnologías

- Next.js App Router y React.
- TypeScript con verificación estricta.
- npm y archivo de bloqueo versionado.
- CSS Modules/CSS inicialmente.
- Zod para validar datos externos.
- PostgreSQL y Prisma para persistencia y migraciones.
- Vitest para pruebas de negocio e integración.
- Playwright para recorridos de navegador.
- GitHub Actions para integración continua.

Durante la inicialización se eligieron versiones exactas, configuración Prisma y adaptadores necesarios según la documentación oficial de las versiones estables instaladas. No reutilices comandos obsoletos para generación, lint u ORM sin comprobarlos.

## Estructura objetivo

| Ruta | Responsabilidad | Momento de creación |
| --- | --- | --- |
| src/app/layout.tsx, page.tsx | Puntos de entrada de App Router | Inicialización |
| src/app/api/expenses/route.ts | Traducción HTTP hacia operaciones de aplicación | Primera función |
| src/modules/expenses/domain/ | Conceptos de gasto, análisis del monto y validación | Primera función |
| src/modules/expenses/application/ | Operaciones de creación, listado y resumen | Primera función |
| src/modules/expenses/infrastructure/ | Adaptación de persistencia Prisma | Primera función |
| src/modules/expenses/ui/ | Componentes de formulario y lista de gastos | Primera función |
| src/modules/telegram/ | Comandos, cliente HTTP, procesamiento de actualizaciones y estado conversacional efímero | v0.2 |
| scripts/telegram-poll.ts | Proceso local de recepción de Telegram | v0.2 |
| src/server/ | Cliente y configuración de base solo del servidor | Primera función o configuración del ORM |
| prisma/ | Configuración del ORM y migraciones versionadas | Configuración inicial; migración con cada función necesaria |
| tests/integration/ | Pruebas contra una base PostgreSQL exclusiva | Primera función |
| tests/e2e/ | Pruebas de recorridos de usuario en navegador | Primera función |
| docs/ | Producto, arquitectura, metodología, decisiones y especificaciones | Paquete inicial |
| prompts/ | Instrucciones reutilizables de desarrollo | Paquete inicial |
| .github/workflows/ | Flujo de integración continua | Inicialización |

Son responsabilidades, no una orden de crear carpetas o clases vacías.
Las pruebas de reglas puras pueden estar junto a la implementación del módulo.
Se introduce un puerto o interfaz cuando aísla un límite significativo de persistencia o proveedor, no solo porque lo sugiera el nombre de una carpeta.

## Reglas de dependencia

- La interfaz envía datos y muestra resultados; no accede a la base.
- Los manejadores de rutas analizan y validan los datos de transporte, y traducen errores y códigos de estado.
- Las operaciones de aplicación implementan la función sin depender de la solicitud HTTP.
- El código de dominio representa reglas de negocio estables y no depende de frameworks.
- La persistencia convierte entre valores de dominio o DTO y tipos de Prisma o de la base.
- Los tipos de Prisma no constituyen el contrato HTTP público.
- Los componentes de servidor pueden llamar consultas de aplicación directamente, sin solicitar su propia API HTTP.
- La validación compartida de solicitudes no reemplaza la validación de negocio en el límite de aplicación.
- Telegram y futuros adaptadores de herramientas del agente reutilizan las operaciones de aplicación.

## Flujo de la primera función

1. El formulario envía una solicitud JSON con el monto como cadena de formato local.
2. POST /api/expenses valida estructura, enumeraciones, cadenas y fecha.
3. El análisis puro del monto convierte la cadena a centavos enteros exactos.
4. createExpense valida las reglas de negocio y pide a persistencia que inserte el registro.
5. Prisma lo adapta a PostgreSQL; el gasto se guarda con id, origen y marcas de tiempo asignados por el servidor.
6. Después de insertar, el backend devuelve un DTO seguro.
7. La interfaz actualiza o vuelve a consultar la lista mínima y el total del mes actual.
8. Una inserción fallida devuelve un error y nunca muestra un gasto guardado.

Para este proyecto de aprendizaje, los endpoints HTTP explícitos hacen visible el límite.
La primera función no necesita Server Actions ni otro framework de API.

## Registro inicial del gasto

| Campo | Representación | Nota |
| --- | --- | --- |
| id | UUID / cadena | Asignado por el backend |
| amount_cents | BIGINT de PostgreSQL | Entero positivo exacto |
| currency | ARS | Única moneda admitida por ahora |
| occurred_on | DATE de PostgreSQL | Fecha civil, no instante UTC |
| category | Código de categoría válido | Valor inicial UNCATEGORIZED |
| payment_method | Código de medio de pago válido | Obligatorio |
| merchant | Cadena anulable | Hasta 120 caracteres |
| description | Cadena anulable | Hasta 500 caracteres |
| source | MANUAL_WEB o TELEGRAM | Asignado por el adaptador de entrada del servidor |
| created_at | Marca de tiempo UTC | Asignada por el backend |
| updated_at | Marca de tiempo UTC | Asignada por el backend |

No agregues external_id, estado de conciliación ni tablas de memoria del agente antes de que sus funciones los necesiten.
El hito local de una sola persona no tiene tabla de usuarios. Crear cuentas requiere una migración de propiedad y limitar cada operación por usuario antes de un uso público o con varias personas.

### Límites del dinero

Los centavos de aplicación se validan como enteros seguros. El máximo de un gasto individual es 99.999.999.999 centavos (ARS 999.999.999,99), un límite técnico explícito. La persistencia usa BIGINT porque el entero ordinario de PostgreSQL resulta insuficiente.

Los valores BIGINT de Prisma se convierten deliberadamente. Nunca serialices un bigint sin convertir a JSON ni conviertas silenciosamente un agregado arbitrariamente grande a number. Sumá en enteros y serializá los totales como cadenas de enteros decimales cuando sea necesario; el formato de presentación es independiente.

Una solicitud nunca usa un número JS fraccionario como fuente de verdad monetaria. Las reglas exactas de análisis están en la especificación de la función y en ADR 003.

### Fechas

Conservá las fechas de ocurrencia como AAAA-MM-DD en transporte y dominio. Usá una conversión explícita a DATE para persistir. No derives la fecha civil convirtiendo una medianoche local a una zona horaria y recortando una cadena UTC.

created_at y updated_at representan instantes, independientemente de la fecha de ocurrencia.
Los rangos del mes actual usan fechas de calendario locales: primer día incluido y primer día del mes siguiente excluido.

## Contrato de errores

Usá errores estructurados de aplicación:
- errores de validación con indicaciones por campo;
- fallas inesperadas de persistencia o servidor con un mensaje genérico para la interfaz;
- detalles de diagnóstico solo en los registros del servidor, sin tokens ni datos personales completos.

POST devuelve 201 después de guardar, 400 para datos inválidos y 500 ante una falla inesperada del servidor.
PUT reemplaza los campos editables de un gasto y DELETE elimina el registro de forma permanente; ambos devuelven 404 si el id no existe. Se validan los parámetros de GET para la lista y la paginación se ejecuta en PostgreSQL.
No confíes en id, origen, marcas de tiempo ni futuros campos de identidad enviados por el cliente.

## Límites futuros

Los canales de mensajería son adaptadores de entrada. Los proveedores de importación son adaptadores de salida o de datos externos.
El LLM elige herramientas estructuradas; estas validan y llaman operaciones de aplicación.

Los datos de negocio viven en PostgreSQL. Las preferencias del agente y las instrucciones de tareas tienen responsabilidades distintas.
El diseño inicial usa un solo agente; no hace falta un framework de orquestación antes de resolver una necesidad concreta.

## Desarrollo local e integración continua

PostgreSQL corre localmente mediante Docker Compose, con un volumen con nombre y un puerto limitado a la interfaz local.
Las pruebas usan otra base y URL; nunca deben vaciar la base de desarrollo.

La primera función incorporó pruebas de dominio, una migración, integración aislada y un recorrido de navegador. El servicio PostgreSQL de pruebas usa una base distinta y almacenamiento temporal; los comandos comprueban la URL antes de ejecutarse.

No se necesita una llamada de red, clave secreta ni cuenta financiera real para construir y probar la función manual de gastos. Las pruebas automatizadas de Telegram usan un cliente simulado; usar el bot real sí requiere configurarlo.

## Documentación de referencia

Comprobada al preparar el paquete el 2026-10-06; verificá de nuevo según las versiones instaladas:
- [Instalación de Next.js](https://nextjs.org/docs/app/getting-started/installation)
- [Conector PostgreSQL de Prisma](https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql)
- [Instrucciones de proyecto de Codex](https://developers.openai.com/codex/guides/agents-md/)
