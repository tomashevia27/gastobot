# GastoBot — Producto

## Problema y usuario

Tomás registra gastos en notas o mensajes para sí mismo. Es rápido, pero luego resulta difícil organizarlos, corregirlos y resumirlos. GastoBot conserva esa facilidad de ingreso y ofrece un registro persistente que se puede consultar.

Usuario inicial: Tomás, con una aplicación local en Argentina.

El proyecto tiene dos objetivos: ser útil para el registro diario de gastos y enseñar desarrollo web moderno e ingeniería de agentes mediante entregas incrementales.

## Principios

- Ingreso rápido y confirmación clara.
- Manejo exacto del dinero.
- Control del usuario sobre edición, eliminación y clasificaciones inciertas.
- Registros de negocio consultables sin depender de una conversación con un LLM.
- Los canales comparten las mismas operaciones de negocio.
- La información desconocida sigue siendo desconocida; el sistema pregunta cuando es necesaria.
- La documentación evoluciona junto con la implementación.

## v0.1: ingreso manual desde la web

Este hito comprende crear, ver, editar y eliminar gastos manuales. Son tareas separadas, no una sola implementación grande.

Primer incremento vertical:
1. Ingresar monto, categoría, medio de pago, fecha de ocurrencia y descripción/comercio opcionales.
2. Validar y guardar el gasto.
3. Mostrarlo en una lista mínima.
4. Mostrar el total del mes calendario actual.
5. Conservarlo después de actualizar la página o reiniciar la aplicación.

La edición, la eliminación y los filtros por mes/categoría con lista paginada están implementados localmente. El resumen sigue mostrando el total del mes actual para todas las categorías, independientemente de los filtros de la lista.
Los gráficos y análisis avanzados corresponden a etapas posteriores.

## v0.2: ingreso por Telegram

La implementación local admite `/gasto` con monto y medio de pago obligatorios, más categoría, fecha, comercio y descripción opcionales. El bot confirma después de persistir. Solo se aceptan mensajes de texto desde el chat privado del usuario configurado. El comando exacto, errores y garantías ante reintentos están en [la especificación implementada](features/telegram-expense-entry.md). La [guía de configuración](telegram-bot-setup.md) explica cómo crear el bot y poner en marcha el proceso local; Tomás confirmó el recorrido con el bot real.

La siguiente mejora de v0.2 está [especificada y pendiente de implementación](features/telegram-guided-expense-entry.md): `/registrar_gasto` inicia una conversación de una pregunta por vez, con botones, campos opcionales, revisión, corrección y confirmación antes de guardar. `/gasto` se conserva como alternativa rápida.

## Reglas iniciales

- Moneda: solo ARS.
- Monto: positivo, con un máximo de dos cifras decimales.
- Formato de entrada: argentino; por ejemplo, 8500, 8500,50 u 8.500,50.
- Fecha: día civil válido; por defecto, el día actual en America/Argentina/Buenos_Aires para la web. En Telegram, la fecha implícita corresponde al día local del mensaje.
- Categoría: conjunto fijo al inicio; por defecto, UNCATEGORIZED.
- Medio de pago: obligatorio y elegido explícitamente.
- Comercio y descripción: opcionales.
- Origen: MANUAL_WEB para la web y TELEGRAM para el bot; lo asigna el servidor.
- Sin autenticación ni varios usuarios en estos hitos locales.
- Sin conversión ni totales combinados entre distintas monedas.
- Sin asesoramiento financiero automático ni dependencia de un LLM en v0.1 o v0.2.

### Categorías

| Código | Etiqueta de la interfaz |
| --- | --- |
| FOOD | Comida |
| SUPERMARKET | Supermercado |
| TRANSPORT | Transporte |
| FUEL | Combustible |
| OUTINGS | Salidas |
| EDUCATION | Facultad / educación |
| HEALTH | Salud |
| SERVICES | Servicios |
| OTHER | Otros |
| UNCATEGORIZED | Sin categoría |

### Medios de pago

| Código | Etiqueta de la interfaz |
| --- | --- |
| CASH | Efectivo |
| MERCADO_PAGO | Mercado Pago |
| DEBIT | Débito |
| CREDIT | Crédito |
| TRANSFER | Transferencia |
| OTHER | Otro |

MERCADO_PAGO es una etiqueta de medio de pago; elegirla no contacta a Mercado Pago.

## Vocabulario del dominio

- Gasto: una salida de dinero registrada; unidad que se cuenta en los totales.
- Monto: cantidad exacta y entera de unidades menores de la moneda.
- Categoría: finalidad o tipo de gasto.
- Medio de pago: cómo se pagó.
- Comercio: quién recibió el pago.
- Origen del gasto: canal por el que ingresó el registro.
- Transacción importada: evidencia externa que no constituye automáticamente un segundo gasto.
- Conciliación: vincular evidencia importada con un gasto existente o confirmar que corresponde a uno nuevo.
- Memoria del agente: preferencias o reglas, como asociaciones entre comercio y categoría.
- Instrucción reutilizable: indicaciones para realizar una tarea.
- Herramienta: capacidad ejecutable y validada de la aplicación.

## Hitos y etapas posteriores

| Etapa | Resultado | Requisito previo |
| --- | --- | --- |
| v0.1 Web | Creación, lista, edición y eliminación manual | Proyecto local funcional |
| v0.2 Telegram | Ingreso de mensajes mediante comandos deterministas | Operaciones de gastos existentes |
| v0.3 Agente | Ingreso en lenguaje natural mediante herramientas estructuradas | Validación de herramientas y evaluaciones iniciales |
| v0.4 Panel | Gráficos y comparaciones | Registros guardados confiables |
| v0.5 Memoria | Preferencias aprendidas explícitas | Reglas que el usuario pueda inspeccionar y corregir |
| v0.6 Importación | Importación de movimientos digitales reales | Datos de ejemplo e investigación del proveedor |
| v0.7 Conciliación | Evitar el doble cómputo entre orígenes | Procedencia y reglas de asociación |
| v0.8 Instrucciones/evaluaciones | Flujos repetibles del agente y evaluación de regresiones | Ejemplos y fallas reales |
| v0.9 WhatsApp | Segundo canal de mensajería | Configuración oficial del canal |
| v1.0 Asistente | Consultas, presupuestos y alertas | Herramientas confiables y controles de acceso |

Las evaluaciones comienzan con la primera función del agente; v0.8 las amplía en lugar de introducirlas por primera vez.

El acceso mediante la API de Mercado Pago a todas las compras personales del consumidor es un supuesto sin verificar. Hay que investigar permisos y datos realmente disponibles antes de comprometerse con una sincronización automática. La importación de CSV o reportes sigue siendo una alternativa posible.

## Ejemplo para un futuro agente

«ayer 23 lucas cena con los pibes efectivo»

Intención esperada: crear un gasto de ARS 23.000 para el día local anterior, con una categoría apropiada, pago en efectivo y descripción.

El código de aplicación debe validar monto, fecha y demás argumentos antes de guardar. Hay que aclarar los datos obligatorios que falten. La categoría puede permanecer como UNCATEGORIZED.

Nunca muestres un porcentaje de confianza inventado como prueba de que dos registros coinciden. Las puntuaciones de asociación necesitan un método documentado; las probabilidades necesitan calibración.
