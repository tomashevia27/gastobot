# Función — Registrar gastos por Telegram

Estado: implementada y verificada localmente en v0.2, incluida una prueba manual con el bot real configurado por Tomás.

## Objetivo y alcance

Tomás envía un comando a su bot en un chat privado y recibe una confirmación solo después de guardar el gasto. El gasto aparece en la lista web y suma en el mes correspondiente. Se aceptan únicamente mensajes del usuario configurado; no se habilitan otros usuarios ni se publica la aplicación web.

Se usan comandos deterministas. Quedan fuera el lenguaje natural, archivos, mensajes de voz, edición o eliminación por Telegram, grupos, webhooks y despliegue remoto.

## Contrato del comando

~~~text
/gasto 8.500,50 efectivo --categoria comida --fecha 2026-10-08 --titulo "Almuerzo" --comercio "Kiosco Norte" --descripcion "Comida del mediodía"
~~~

`monto` y `medio de pago` son obligatorios. Las opciones son opcionales, pueden ir en cualquier orden y solo una vez cada una. Los valores con espacios deben ir entre comillas dobles; dentro de ellas se pueden escribir `\"` y `\\`. No se interpreta texto libre. Los valores desconocidos, opciones repetidas, comillas sin cerrar y argumentos sobrantes se rechazan sin guardar nada.

El monto usa exactamente las reglas argentinas de la creación web. La categoría omitida es `UNCATEGORIZED`; título, comercio y descripción omitidos son nulos. La fecha omitida es el día civil de `message.date` en `America/Argentina/Buenos_Aires`, no el día en que el proceso finalmente recibe el mensaje. Una fecha explícita debe ser `AAAA-MM-DD` real.

| Campo | Valores aceptados en el comando |
| --- | --- |
| Medio de pago | `efectivo`, `mercado_pago`, `debito`, `credito`, `transferencia`, `otro` |
| Categoría | `comida`, `supermercado`, `transporte`, `combustible`, `salidas`, `educacion`, `salud`, `servicios`, `otros`, `sin_categoria` |

`/start`, `/ayuda` y `/help` muestran ayuda. Un comando no reconocido recibe una indicación para usar `/ayuda`; los mensajes que no comienzan con `/` reciben la misma indicación. Las respuestas son texto simple sin formato de Telegram.

## Seguridad y entrega

El proceso local usa `getUpdates` y `sendMessage` con un token de BotFather. Solo procesa `message.text` cuando `message.chat.type` es `private` y `message.from.id` coincide con `TELEGRAM_ALLOWED_USER_ID`. Ignora los demás chats, emisores y tipos de actualización sin responder. Se inicia una sola instancia del proceso por bot.

Los mensajes se procesan en orden. Antes de confirmar el siguiente `offset`, el gasto y la identidad de la actualización se guardan en una transacción. Una clave única `(bot_id, update_id)` evita crear dos gastos ante reintentos, incluso si luego se borra el gasto. Si falla `sendMessage`, el proceso reintenta sin avanzar el offset. Una falla ambigua después de enviar puede repetir la confirmación, pero no el gasto. No se promete entrega única de respuestas.

El token y el ID autorizado viven en `.env`, ignorado por Git. No se registran tokens ni el texto completo de mensajes en los registros del proceso. Telegram retiene las actualizaciones pendientes durante un plazo limitado; la computadora y el proceso deben estar encendidos para recibirlas oportunamente.

## Criterios de aceptación

1. Un comando válido del usuario configurado guarda un gasto ARS con origen `TELEGRAM` y datos exactos.
2. La confirmación incluye monto, fecha, categoría y medio de pago, y se envía después de persistir.
3. Una fecha omitida respeta la fecha de envío en Buenos Aires aunque el procesamiento ocurra otro día.
4. Entradas inválidas reciben una explicación y no escriben en PostgreSQL.
5. Emisores distintos, grupos y actualizaciones que no sean mensajes de texto no crean gastos ni reciben respuestas.
6. Una actualización repetida no duplica el gasto, incluso después de eliminarlo desde la web.
7. Una falla temporal de Telegram o PostgreSQL no se confirma como éxito y permite reintentar.
8. El flujo web sigue asignando `MANUAL_WEB` y no acepta un origen suministrado por el cliente.

## Verificación

Pruebas unitarias del analizador de comandos, opciones y fecha local. Pruebas de integración con `gastobot_test` para transacción, origen, reintentos y regresión web. Cliente de Telegram simulado para recepción y respuesta; la guía de configuración describe la prueba manual real.
