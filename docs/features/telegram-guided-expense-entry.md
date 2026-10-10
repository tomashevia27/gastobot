# Función — Registro guiado de gastos por Telegram

Estado: implementada y probada con el bot real por Tomás.

## Objetivo

Una persona sin conocimientos técnicos puede registrar un gasto desde Telegram mediante una conversación guiada. El bot pregunta un dato por vez, ofrece botones cuando existe un conjunto cerrado de respuestas y muestra un resumen editable antes de guardar.

El comando canónico es `/registrar_gasto`. Telegram admite letras latinas, números y guiones bajos en los comandos, pero no guiones medios; por eso `/registrar-gasto` no puede aparecer en el menú de comandos. El bot aceptará `/registrar-gasto` como alias textual por conveniencia, pero mostrará y documentará `/registrar_gasto`.

El flujo guiado complementa a `/gasto`: el comando determinista existente continúa disponible para el ingreso rápido.

## Alcance

- Un único usuario configurado y un chat privado autorizado.
- Gastos en pesos argentinos (ARS).
- Una pregunta por mensaje.
- Botones de Telegram para elecciones cerradas.
- Monto y medio de pago obligatorios.
- Categoría, fecha, título, comercio y descripción opcionales.
- Revisión y corrección antes de guardar.
- Cancelación y vencimiento del flujo.
- Estado temporal en memoria; un reinicio del proceso descarta el borrador.

Quedan fuera el soporte para varios usuarios, la persistencia de borradores, la edición o eliminación de gastos ya guardados desde Telegram, el lenguaje natural, los mensajes de voz, los archivos, los grupos, los webhooks y los cambios a la taxonomía de categorías.

## Recorrido principal

1. El usuario envía `/registrar_gasto` o toca **Registrar gasto** en la bienvenida o en una confirmación anterior.
2. El bot inicia un borrador con una vigencia máxima de diez minutos y pregunta el monto.
3. Después de cada respuesta válida, el bot guarda el dato en el borrador y pregunta el siguiente campo.
4. El orden es monto, medio de pago, categoría, fecha, título, comercio y descripción.
5. El bot muestra un resumen con los siete campos y los botones **Confirmar**, **Corregir** y **Cancelar**.
6. **Confirmar** valida todos los datos nuevamente mediante la operación de aplicación compartida y guarda el gasto con origen `TELEGRAM`.
7. Solo después de persistir, el bot informa que el gasto fue registrado y ofrece **Registrar otro gasto**.

El borrador no se escribe en `expenses`. Abandonar, cancelar o dejar vencer el flujo no crea registros parciales.

## Flujo por campo

### 1. Monto

Mensaje sugerido:

> ¿Cuánto gastaste? Escribí el monto en pesos. Por ejemplo: 8500, 8500,50 o 8.500,50.

El monto se escribe como texto y usa las mismas reglas argentinas y los mismos límites que la web y `/gasto`. Una entrada inválida conserva el paso actual y explica brevemente los formatos aceptados.

No existe la opción de omitirlo.

### 2. Medio de pago

El bot presenta botones en varias filas:

| Etiqueta | Valor |
| --- | --- |
| Efectivo | `CASH` |
| Mercado Pago | `MERCADO_PAGO` |
| Débito | `DEBIT` |
| Crédito | `CREDIT` |
| Transferencia | `TRANSFER` |
| Otro | `OTHER` |

`MERCADO_PAGO` representa por ahora cualquier pago identificado por el usuario como Mercado Pago, sin distinguir el origen interno de los fondos. No existe la opción de omitir el medio de pago.

### 3. Categoría

El bot presenta las categorías actuales mediante botones en varias filas:

| Etiqueta | Valor |
| --- | --- |
| Comida | `FOOD` |
| Supermercado | `SUPERMARKET` |
| Transporte | `TRANSPORT` |
| Combustible | `FUEL` |
| Salidas | `OUTINGS` |
| Facultad / educación | `EDUCATION` |
| Salud | `HEALTH` |
| Servicios | `SERVICES` |
| Otros | `OTHER` |
| Sin categoría | `UNCATEGORIZED` |

Como omitir la categoría y elegir **Sin categoría** producen `UNCATEGORIZED`, se muestra un único botón **Omitir (sin categoría)** para esa acción.

No se agregan categorías en este incremento. Hogar, indumentaria, mascotas e impuestos son candidatas posibles, pero cambiar la taxonomía afecta tanto la web como Telegram y se decidirá por separado a partir del uso real.

### 4. Fecha

El bot ofrece:

- **Hoy / Omitir**: fecha civil en `America/Argentina/Buenos_Aires` correspondiente al inicio del flujo.
- **Ayer**: día civil anterior a la fecha de inicio.
- **Otra fecha**: solicita una fecha escrita como `DD/MM/AAAA`, por ejemplo `08/10/2026`.

Se usa un solo botón para hoy y omitir porque ambas acciones tienen el mismo resultado. Una fecha escrita debe existir realmente en el calendario. El bot conserva internamente el formato de dominio `AAAA-MM-DD`.

La fecha predeterminada queda fijada al comenzar el flujo. Confirmar después de medianoche no cambia el día del gasto.

### 5. Título

El usuario escribe un título breve o toca **Omitir**. El título es independiente del comercio y admite hasta 120 caracteres. En la web es el encabezado del gasto; si falta, se muestra el comercio o la categoría.

### 6. Comercio

El usuario escribe el nombre del comercio o toca **Omitir**. Se aplican el recorte de espacios y el límite de 120 caracteres existentes. Omitir produce `null`.

### 7. Descripción

El usuario escribe una descripción o toca **Omitir**. Se aplican el recorte de espacios y el límite de 500 caracteres existentes. Omitir produce `null`.

## Revisión y corrección

Antes de guardar, el bot presenta:

> Revisá el gasto<br>
> Monto: $8.500,50<br>
> Medio: Mercado Pago<br>
> Categoría: Comida<br>
> Fecha: 08/10/2026<br>
> Título: Almuerzo<br>
> Comercio: Kiosco Norte<br>
> Descripción: Almuerzo

Los valores opcionales ausentes se muestran como `—`. Debajo aparecen **Confirmar**, **Corregir** y **Cancelar**.

- **Confirmar** intenta guardar una sola vez de forma idempotente.
- **Corregir** muestra botones para elegir cualquiera de los siete campos. El bot vuelve a preguntar únicamente ese campo y luego regresa al resumen. Los campos opcionales pueden eliminarse con **Omitir**.
- **Cancelar** descarta el borrador y no guarda nada.

No se ofrece navegación hacia el paso anterior durante la carga inicial.

## Confirmación posterior al guardado

Después de persistir correctamente:

> ✅ Gasto registrado<br>
> Monto: $8.500,50<br>
> Medio: Mercado Pago<br>
> Categoría: Comida<br>
> Fecha: 08/10/2026<br>
> Título: Almuerzo<br>
> Comercio: Kiosco Norte<br>
> Descripción: Almuerzo

El mensaje incluye el botón **Registrar otro gasto**, que inicia un borrador nuevo. Una falla de validación o persistencia nunca se presenta como éxito.

## Cancelación, reemplazo y vencimiento

`/cancelar` funciona en cualquier paso, incluida la revisión. Si existe un borrador, lo descarta y lo confirma; si no existe, informa que no hay un registro en curso.

Si llega `/registrar_gasto` mientras existe un borrador vigente, el bot no lo reemplaza inmediatamente. Pregunta:

> Ya tenés un gasto en curso. ¿Querés descartarlo y empezar de nuevo?

Ofrece **Empezar de nuevo** y **Continuar el actual**. Continuar vuelve a mostrar la pregunta pendiente; empezar de nuevo descarta el borrador anterior y reinicia el plazo.

El borrador vence diez minutos después de recibir el comando que lo inició. El plazo es absoluto y no se extiende con cada respuesta. No hace falta enviar una notificación automática al cumplirse el tiempo; ante la próxima interacción, el bot informa que el registro venció y ofrece empezar otro.

El estado vive en memoria. Si el proceso se reinicia, el borrador se pierde. Una respuesta o un botón perteneciente a ese borrador recibe una indicación para usar `/registrar_gasto` otra vez.

## Comandos, bienvenida y menú

`/start` muestra una bienvenida breve, explica que el bot registra gastos personales y ofrece el botón **Registrar gasto**. `/ayuda` describe tanto el flujo guiado como `/gasto`.

Durante un borrador, `/start` y `/ayuda` muestran su información sin descartarlo y recuerdan cuál es la pregunta pendiente. `/gasto` no se interpreta como respuesta a un campo: el bot pide terminar o cancelar el borrador antes de usar el comando rápido. Fuera de un borrador, `/gasto` conserva exactamente su comportamiento actual. Un texto libre recibido sin un flujo activo indica cómo iniciar `/registrar_gasto` o consultar `/ayuda`.

El menú del bot debe incluir al menos:

| Comando | Descripción |
| --- | --- |
| `/registrar_gasto` | Registrar un gasto paso a paso |
| `/gasto` | Registrar un gasto con un comando rápido |
| `/cancelar` | Cancelar el registro en curso |
| `/ayuda` | Ver ayuda y ejemplos |

La configuración del menú ocurre al iniciar el proceso y se documenta en la [guía del bot](../telegram-bot-setup.md).

## Reglas de interacción y seguridad

- Se mantienen la verificación del chat privado y del único usuario configurado antes de leer comandos, respuestas o pulsaciones de botones.
- El despachador reconoce primero los comandos globales y luego interpreta texto o botones según el paso activo.
- Una respuesta inválida no borra los valores ya ingresados ni avanza el paso.
- Cuando un paso requiere botones, un texto libre recibe una indicación para usar las opciones visibles.
- Cada botón queda asociado al borrador y al paso que lo generó. Pulsar un botón viejo, repetido o de otro paso no modifica el estado ni crea gastos.
- El bot responde las pulsaciones de botones para que Telegram deje de mostrar el indicador de espera.
- Los textos del usuario no se incorporan a registros de diagnóstico completos.

## Estado de conversación y arquitectura

El adaptador de Telegram incorpora una máquina de estados explícita (`src/modules/telegram/conversation.ts`), separada de las reglas del gasto. El estado mínimo de un borrador contiene:

- el chat que creó el borrador;
- identificador opaco del flujo;
- instante de inicio y vencimiento;
- paso actual;
- valores ya respondidos;
- campo que se está corrigiendo, cuando corresponda;
- identificador de la última actualización atendida, para que un reintento no avance dos pasos.

Los estados son: monto, medio de pago, categoría, fecha, fecha escrita, título, comercio, descripción, revisión y selección de corrección. La confirmación no necesita un estado propio: el poller procesa las actualizaciones en orden secuencial, así que el borrador se libera recién después de persistir y enviar la respuesta.

El cliente HTTP de Telegram recibe `callback_query`, envía teclados en línea y responde las pulsaciones; la máquina de estados traduce mensajes y callbacks a transiciones, y solo la transición de confirmación llama a `createTelegramExpense`.

La creación mantiene la transacción y la clave `(bot_id, update_id)` existentes. La actualización que contiene la confirmación identifica el intento de creación. El borrador se conserva hasta que la persistencia y el envío de la respuesta terminan, para que un reintento del mismo update reutilice la entrada y no duplique el gasto. Los reintentos y reinicios posteriores a una persistencia ambigua deben consultar el registro procesado antes de intentar una nueva creación.

No se agrega una tabla de sesiones: la decisión de comenzar otra vez después de un reinicio permite mantener el estado efímero en el proceso local.

## Criterios de aceptación

1. `/registrar_gasto`, su alias textual y los botones de inicio crean un borrador, sin insertar un gasto.
2. El bot pregunta un campo por vez en el orden acordado y usa botones para medios, categorías y fechas predefinidas.
3. Monto y medio de pago no pueden omitirse; los otros cinco campos pueden usar sus valores predeterminados o nulos.
4. El monto acepta los formatos argentinos actuales y una fecha escrita válida acepta `DD/MM/AAAA`.
5. El resumen permite confirmar, elegir y corregir cualquier campo o cancelar antes de guardar.
6. Solo confirmar guarda un gasto ARS con origen `TELEGRAM` y los datos exactos del resumen.
7. La respuesta de éxito se envía después de persistir e incluye los siete campos y **Registrar otro gasto**.
8. `/cancelar`, un reemplazo confirmado, el vencimiento y un reinicio descartan el borrador sin crear un gasto parcial.
9. Un segundo inicio no reemplaza silenciosamente un borrador vigente.
10. Botones viejos o repetidos y actualizaciones reintentadas no avanzan dos pasos ni duplican gastos.
11. `/gasto` conserva su contrato y comportamiento actuales.
12. Usuarios no autorizados, grupos y tipos de actualización no admitidos siguen sin crear gastos ni recibir datos del borrador.

## Estrategia de verificación para la implementación

- Pruebas unitarias de la máquina de estados: recorrido completo, errores por paso, omisiones, correcciones, cancelación, reemplazo, vencimiento y callbacks antiguos.
- Pruebas unitarias de conversión de `DD/MM/AAAA`, incluidos días imposibles y años bisiestos.
- Pruebas del cliente de Telegram para mensajes, teclados en línea y respuestas a callbacks sin llamadas reales.
- Pruebas de integración con `gastobot_test` para confirmar que no se persiste antes de aprobar, que el gasto final es exacto y que los reintentos no duplican.
- Pruebas de regresión para `/gasto`, autorización y fecha local.
- Prueba manual con el bot real del recorrido principal, corrección, cancelación, vencimiento y botón **Registrar otro gasto**.

## Secuencia prevista de implementación

La implementación se dividirá en incrementos verticales que puedan revisarse y verificarse por separado:

1. **Interacciones de Telegram:** ampliar los tipos y el cliente HTTP para recibir callbacks, enviar teclados en línea y responder pulsaciones; cubrir el contrato con pruebas del cliente simulado.
2. **Conversación guiada:** implementar la máquina de estados efímera, las transiciones, el plazo de diez minutos y la conversión de fecha, con pruebas unitarias de los recorridos completos y alternativos.
3. **Creación segura:** conectar la confirmación con `createTelegramExpense`, mantener la deduplicación ante reintentos y cubrir la persistencia con `gastobot_test`.
4. **Experiencia y operación:** actualizar bienvenida, ayuda, menú y guía de BotFather; ejecutar regresiones de `/gasto` y la prueba manual con el bot real.

El flujo guiado original no necesitó una tabla de sesiones. La incorporación posterior del título sí agrega una columna anulable a `expenses`.

## Decisiones tomadas

- Se mantiene la taxonomía actual de categorías durante este incremento.
- El flujo pide título, comercio y descripción por separado.
- La moneda no se pregunta: siempre es ARS.
- La revisión ocurre antes de persistir.
- La corrección se realiza desde el resumen, campo por campo.
- El borrador vence a los diez minutos desde su inicio y no sobrevive a reinicios.
- `/gasto` continúa como alternativa rápida.
- El alcance permanece limitado a un usuario autorizado.
- El resumen y la confirmación reutilizan `formatArsCents`, por lo que el símbolo moneda conserva el mismo espacio no separable que la web; el ejemplo `Monto: $8.500,50` de esta especificación es equivalente.
- Los comandos se comparan sin el sufijo `@nombre_del_bot`, de modo que `/gasto@MiGastoBot` equivale a `/gasto`.
- Al iniciar con un comando, la fecha por defecto se calcula desde el instante del mensaje de Telegram; al iniciar desde un botón, se usa el reloj del proceso. En ambos casos se convierte a `America/Argentina/Buenos_Aires`.
- Una falla transitoria al responder un callback impide avanzar el `offset` y se reintenta. Si Telegram rechaza definitivamente un callback vencido con un error 4xx, el bot continúa y envía por mensaje cualquier aviso que el usuario necesite ver.
- Si el gasto ya se persistió pero el proceso se reinicia antes de confirmar por Telegram, el reintento consulta `telegram_processed_updates` y reconstruye la confirmación sin duplicar el gasto.

Referencia del proveedor: [comandos de bots de Telegram](https://core.telegram.org/bots/features#commands).
