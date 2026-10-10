# GastoBot — Instrucciones para agentes

## Contexto y alcance

GastoBot es un registro de gastos personales y un proyecto de aprendizaje.
Estado actual: la v0.2 local permite administrar gastos manuales e ingresar gastos por Telegram mediante comandos deterministas o mediante el registro guiado paso a paso (`/registrar_gasto`).
Leé la especificación activa de la función antes de modificar el código.

Documentación:
- docs/product.md: comportamiento y hoja de ruta.
- docs/architecture.md: límites y estructura objetivo.
- docs/development-methodology.md: método de trabajo y verificación.
- docs/decisions/: decisiones y consecuencias.
- docs/features/: criterios de aceptación.

## Acuerdo de trabajo

- Explicá planes, cambios y flujo de datos a Tomás en español; los identificadores de código van en inglés.
- Inspeccioná el repositorio actual y conservá el trabajo existente antes de editar.
- Para tareas no triviales, presentá un plan breve con archivos, flujo y verificación.
- Si se pide solo un plan, detenete después de planificar.
- Una solicitud explícita de implementación autoriza esa tarea. Respetá su alcance.
- Preferí incrementos verticales pequeños; explicá los supuestos relevantes y las nuevas decisiones de arquitectura.
- No implementes funciones de la hoja de ruta de manera oportunista.
- Durante una implementación autorizada, registrá cada incremento pequeño y coherente en un commit después de sus verificaciones pertinentes. No hagas push ni despliegues salvo que la solicitud activa lo autorice.

## Flujo de incrementos y commits

- Dividí el trabajo de cada función en incrementos pequeños y coherentes, con un comportamiento o límite concreto.
- Incluí implementación, pruebas directamente relacionadas y configuración o documentación necesaria en el mismo incremento. Verificá la coherencia de los cambios solo documentales; no agregues pruebas artificiales.
- Ordená los incrementos para que cada commit propuesto funcione por sí solo y pase sus verificaciones pertinentes. Mantené juntos el código y las pruebas acopladas si separarlos dejaría un estado intermedio roto.
- Revisá el diff preparado y registrá las verificaciones ejecutadas para cada incremento. No dividas el trabajo mecánicamente por tipo de archivo o directorio.
- Tomás autoriza commits incrementales durante el trabajo de implementación. Una solicitud solo de planificación o revisión no autoriza commits. No reescribas commits anteriores sin una solicitud explícita.

## Tecnologías y límites

Next.js App Router, React, TypeScript estricto, npm, PostgreSQL, Prisma, Zod,
CSS Modules/CSS y Vitest; Playwright cuando exista un recorrido completo de usuario.
Comprobá versiones estables compatibles durante la inicialización y conservá package-lock.json.
Usá un monolito modular organizado por función. Introducí puertos cuando aíslen un límite real.
Las reglas de dominio no deben importar React, Next.js, Prisma ni SDK de proveedores externos.
Mantené delgados los manejadores de transporte. El código de aplicación dirige las operaciones de negocio.
Mantené el acceso a la base y los secretos del lado del servidor; nunca los incluyas en código enviado al cliente.
La v0.2 es de uso local para una sola persona; antes de un uso público o con varias personas se requieren autenticación y controles de propiedad.

## Reglas de datos

- Las versiones locales actuales solo usan ARS. Guardá el dinero como centavos enteros, nunca como montos decimales de punto flotante.
- Interpretá los montos decimales desde cadenas con formato argentino explícito; validá los límites de enteros seguros.
- amount_cents es BIGINT en PostgreSQL. Convertí explícitamente los bigint de Prisma en los límites de los DTO.
- La fecha de ocurrencia es una fecha civil AAAA-MM-DD; las marcas de tiempo son instantes UTC.
- Calculá «hoy» en America/Argentina/Buenos_Aires, no a partir de la fecha UTC del servidor.
- Validá en el servidor aunque la interfaz ya haya validado.
- No inventes medios de pago faltantes ni reclasifiques gastos desconocidos en silencio.
- Conservá la diferencia entre datos de negocio, memoria del agente e instrucciones reutilizables.
- Las futuras herramientas del agente llamarán operaciones de aplicación validadas; el modelo no ejecutará SQL arbitrario.

## Verificación y finalización

Comandos configurados:
- npm run lint
- npm run typecheck
- npm test (una ejecución de las pruebas de dominio)
- npm run build
- npm run db:validate
- npm run test:integration (base exclusiva gastobot_test)
- npm run test:e2e (Playwright contra gastobot_test)

Usá TDD para reglas de negocio significativas y pruebas de integración para persistencia.
Probá el comportamiento de usuario; evitá pruebas que reproduzcan el código o verifiquen detalles triviales de estilo.
En cada tarea informá el comportamiento cambiado, las verificaciones realmente ejecutadas, sus resultados y los bloqueos.
No presentes verificaciones indisponibles ni una suite vacía como cobertura aprobada.
No ocultes pruebas fallidas, desactives verificaciones para forzar un éxito ni toques datos reales del usuario en las pruebas.
Actualizá la documentación cuando cambie el comportamiento o la configuración. La definición de terminado está en la metodología.

No agregues microservicios, Redis, almacenamiento vectorial, buses de eventos, CQRS, event sourcing
ni varios agentes sin un requisito concreto. El flujo de gastos manuales no necesita dependencias de LLM, Telegram ni Mercado Pago.
