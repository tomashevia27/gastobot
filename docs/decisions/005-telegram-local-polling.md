# ADR 005 — Telegram local con polling e idempotencia persistente

Status: Aceptada e implementada en v0.2.
Date: 2026-10-08.

## Contexto

v0.1 corre en una computadora local y no tiene autenticación para publicar la web. Telegram ofrece `getUpdates` o webhooks para entregar actualizaciones. Un webhook exigiría un endpoint HTTPS accesible desde Internet y cambiaría el modelo de despliegue antes de necesitarlo.

Telegram puede volver a entregar una actualización cuando no está confirmada. El proceso también puede detenerse después de escribir un gasto y antes de avanzar el `offset`. Borrar un gasto desde la web no debería permitir que ese mismo mensaje lo recree al reintentarse.

## Decisión

- Usar un proceso Node local y `getUpdates`, secuencialmente, con una única instancia por bot. No abrir un endpoint público.
- Admitir únicamente `message.text` de un chat privado cuyo `chat.id` y `from.id` sean el ID de usuario configurado. El token y el ID viven en `.env`.
- Parsear comandos de sintaxis fija. La fecha implícita procede de la hora de envío de Telegram convertida a Buenos Aires.
- Reutilizar la validación y operación de creación de gastos. El servidor asigna `source=TELEGRAM`; la web sigue asignando `MANUAL_WEB`.
- Guardar el gasto y `(bot_id, update_id)` en una transacción PostgreSQL. La clave única identifica reintentos; la referencia al gasto se vuelve nula si se elimina, pero el registro de actualización permanece.
- Avanzar el `offset` solo después de procesar y responder. Ante falla se reintenta con pausa progresiva. Una respuesta puede repetirse si su entrega fue ambigua; el gasto no se duplica.

## Consecuencias

No se necesitan túneles, despliegue remoto, colas ni nuevas cuentas en la app. El bot solo funciona mientras la computadora y el proceso estén activos; Telegram limita el tiempo de conservación de actualizaciones. Si se decide un servicio siempre activo, hará falta una decisión de alojamiento y revisar autenticación y alcance de la web antes de exponerla.

La tabla de actualizaciones es específica de este canal y existe para sostener una regla observable: un mismo mensaje no crea más de un gasto. No es un sistema genérico de eventos ni una tabla de memoria del agente.

Referencias: [Telegram Bot API — Getting updates](https://core.telegram.org/bots/api#getting-updates), [setWebhook](https://core.telegram.org/bots/api#setwebhook).
