# Crear y usar el bot de Telegram

Esta guía configura la v0.2 para **una sola cuenta de Telegram** y una aplicación que corre en tu computadora. No necesitás una URL pública ni un túnel. El proceso debe permanecer encendido para recibir mensajes.

## 1. Crear el bot

1. En Telegram, abrí el [BotFather oficial](https://t.me/BotFather) y comprobá que sea la cuenta verificada.
2. Enviá `/newbot`.
3. Elegí un nombre visible, por ejemplo `GastoBot personal`, y un nombre de usuario único que termine en `bot`, por ejemplo `MiGastoBot`.
4. BotFather te dará un token. Tratá ese token como una contraseña: no lo pegues en chats, capturas, commits ni comandos que puedan quedar en el historial. Si se filtra, generá otro desde BotFather con `/token`.

Estos pasos y el formato del nombre de usuario están en la [guía oficial de BotFather](https://core.telegram.org/bots/features#creating-a-new-bot).

## 2. Guardar el token e identificar tu cuenta

1. Desde la raíz del proyecto, activá Node 24.15.0 y ejecutá `npm ci` si todavía no instalaste las dependencias. Si todavía no tenés `.env`, crealo desde `.env.example`. No reemplaces un `.env` existente: contiene la conexión a tu base local.
2. Abrí `.env` en un editor y completá:

   ~~~dotenv
   TELEGRAM_BOT_TOKEN="el_token_que_entrego_BotFather"
   ~~~

3. Abrí un chat **privado** con tu bot y enviá `/start` desde la cuenta que va a registrar gastos.
4. En la raíz del proyecto, ejecutá `npm run telegram:identify`. Muestra los IDs de chats privados que enviaron `/start` y siguen pendientes. No imprime el token ni el contenido de los mensajes. Si aparecen varios IDs, asegurate de elegir el de tu cuenta; podés repetir el paso usando un bot nuevo si hay dudas.
5. Copiá ese número en `.env`:

   ~~~dotenv
   TELEGRAM_ALLOWED_USER_ID="123456789"
   ~~~

El comando de identificación lee actualizaciones pendientes sin confirmarlas. Si no encuentra `/start`, enviá el mensaje otra vez y repetí el comando. No ejecutes a la vez el identificador y el proceso principal. El archivo `.env` está ignorado por Git.

## 3. Preparar la base e iniciar

En una terminal, ejecutá `npm run local`. Esto levanta PostgreSQL, aplica las migraciones y abre la aplicación web en `http://localhost:3000`.

En otra terminal, desde el mismo proyecto y con Node 24.15.0 activo, ejecutá:

~~~bash
npm run telegram
~~~

Mantené esa terminal abierta. Los comandos locales de Telegram priorizan IPv4 porque en el entorno de desarrollo la conexión HTTPS de Node a `api.telegram.org` agotaba el tiempo de espera al elegir la dirección predeterminada. Al arrancar, el proceso publica el menú de comandos de Telegram con `/registrar_gasto`, `/gasto`, `/cancelar` y `/ayuda`; eso reemplaza cualquier menú anterior cargado con `/setcommands` en BotFather. Si la publicación falla, el proceso sigue funcionando y podés definir el menú desde BotFather.

En el chat privado, probá:

~~~text
/ayuda
/registrar_gasto
/gasto 8.500,50 efectivo --categoria comida --comercio "Kiosco Norte"
~~~

`/registrar_gasto` acompaña un paso por vez: monto, medio de pago, categoría, fecha, comercio y descripción; después muestra un resumen con **Confirmar**, **Corregir** y **Cancelar**, y solo guarda cuando confirmás. El borrador dura diez minutos y se descarta con `/cancelar`.

`/gasto` confirma monto, fecha, categoría y medio de pago de una sola vez. Abrí la web y verificá el gasto en la lista; si la fecha corresponde a otro mes, usá el filtro mensual. El total del mes actual solo incluye gastos de ese mes. También podés usar `--fecha AAAA-MM-DD` y `--descripcion "texto con espacios"`. Los valores de categorías y medios aparecen en `/ayuda`.

Detené el proceso con `Ctrl+C`. Para volver a recibir mensajes, ejecutá otra vez `npm run telegram`. Ejecutá **una sola instancia** por bot.

## Si algo falla

- **No aparece respuesta:** comprobá que `npm run telegram` siga activo, que el mensaje se haya enviado en un chat privado y que el ID configurado sea el de tu cuenta. Otros usuarios y grupos se ignoran sin respuesta.
- **Error al iniciar:** revisá que el token siga vigente, que PostgreSQL esté activo y que las dos variables de Telegram estén configuradas. No pegues el token en un reporte de error.
- **Webhook activo:** `getUpdates` no funciona mientras exista un webhook. Si ese bot ya se usaba con webhook, retiralo desde su configuración de Telegram antes de iniciar este proceso, o creá uno nuevo para GastoBot. No se elimina automáticamente ningún webhook.
- **La computadora estuvo apagada:** Telegram conserva actualizaciones pendientes por un máximo de 24 horas. Las más antiguas pueden perderse; revisá la lista web antes de volver a enviar un gasto.
- **Confirmación repetida:** puede ocurrir si una respuesta se envió pero no llegó la confirmación de recepción al proceso. La misma actualización no crea un segundo gasto.
- **Botón viejo sin efecto:** los botones pertenecen a un borrador y a un paso concretos. Si el registro venció o ya se guardó, el bot lo indica y pide empezar de nuevo con `/registrar_gasto`.
- **Respuestas que tardan 20–30 segundos:** reiniciá `npm run telegram` para cargar la configuración actual que prioriza IPv4. Si sigue apareciendo `Fallo de Telegram`, el proceso está reintentando. `getUpdates` indica un problema al recibir mensajes; `sendMessage` o `answerCallbackQuery`, al responder. Un `HTTP 409` en `getUpdates` suele indicar otra instancia del bot o un webhook activo. Un código como `ETIMEDOUT` indica un problema de conexión. La línea muestra la operación y el tiempo hasta el próximo intento sin imprimir el token ni el contenido del gasto.

La recepción por `getUpdates`, el uso de `offset`, la exclusión mutua con webhooks y el plazo de retención están descritos en la [API oficial de bots](https://core.telegram.org/bots/api#getting-updates).
