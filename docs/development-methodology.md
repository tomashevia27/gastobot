# GastoBot — Metodología de desarrollo

## 1. Objetivo

GastoBot se desarrollará por incrementos como:

1. Una aplicación útil para las finanzas personales.
2. Un proyecto para aprender desarrollo web moderno e ingeniería de agentes de IA.

La prioridad no es generar la mayor cantidad de código en el menor tiempo.
La prioridad es comprender, verificar y evolucionar el sistema gradualmente.

## 2. Principios de ingeniería

### 2.1 Cambios pequeños

El desarrollo debe avanzar mediante cambios pequeños que puedan verificarse de manera independiente.
Idealmente, cada tarea debería poder completarse en unas horas y no en varios días.

Cada tarea debe tener:
- un objetivo claro;
- alcance explícito;
- criterios de aceptación;
- pruebas o una estrategia de verificación;
- un diff pequeño que se pueda revisar.

Evitá cambios grandes como «Implementar toda la integración de Telegram».

Preferí, por ejemplo:
1. Recibir y validar un tipo de actualización de Telegram en el límite de transporte elegido.
2. Extraer el mensaje de texto de una actualización aceptada.
3. Convertir el mensaje en un comando CreateExpense.

Son incrementos de infraestructura al servicio de un recorrido completo para el usuario; no justifican construir todos los adaptadores antes de entregar un comportamiento útil.

### 2.2 Incrementos verticales

Preferí desarrollar las funciones de extremo a extremo antes que completar capas enteras de arquitectura por separado.

En vez de:
1. Construir todos los repositorios de base de datos.
2. Construir todos los servicios.
3. Construir todos los controladores.
4. Construir toda la interfaz.

Preferí:
- Incremento 1: el usuario puede crear un gasto, con formulario, límite HTTP, validación, lógica de aplicación, persistencia y pruebas automatizadas.
- Incremento 2: el usuario puede consultar gastos con mejores filtros y navegación.
- Incremento 3: el usuario puede editar un gasto.
- Incremento 4: el usuario puede eliminar un gasto.

Cada incremento deja la aplicación en funcionamiento.
En el primero de GastoBot, una lista mínima y el total del mes actual cierran el ciclo de confirmación de la creación. La lista completa, los filtros y un panel de control son trabajos separados.

## 3. Enfoque de arquitectura

La arquitectura evoluciona con el proyecto.

No diseñes infraestructura para requisitos futuros hipotéticos.
La complejidad arquitectónica debe responder a una necesidad existente o claramente inminente.
La arquitectura inicial es un monolito modular.

Una aplicación Next.js aloja la presentación y las operaciones de aplicación. Las reglas de dominio no dependen de frameworks; la persistencia es infraestructura utilizada por la aplicación. Las dependencias concretas están en docs/architecture.md.

Los sistemas externos se tratan como adaptadores:
- Telegram;
- Mercado Pago;
- PostgreSQL;
- proveedor de LLM;
- WhatsApp.

El dominio no debe depender directamente de ellos.

## 4. Diseño guiado por el dominio

Usaremos DDD de forma pragmática.
Sirve para modelar el problema con claridad, no para maximizar la cantidad de abstracciones.

El vocabulario inicial del dominio incluye:
- gasto;
- monto;
- moneda;
- categoría;
- comercio;
- medio de pago;
- origen del gasto;
- transacción;
- transacción importada;
- conciliación.

Usá estos términos de manera coherente en código, base de datos, interfaz, documentación y pruebas.
Los identificadores en inglés pueden tener etiquetas coherentes en español en la interfaz.

Evitá nombres genéricos como Data, Manager, Helper, Processor, Item o Utils cuando exista un concepto preciso del dominio.

La presencia de términos futuros en el vocabulario no obliga a implementar todos esos modelos en v0.1.

## 5. Arquitectura hexagonal

Introduciremos arquitectura hexagonal en los límites donde aporte aislamiento útil.

~~~mermaid
flowchart TD
    Web["Adaptador web"] --> App["Aplicación de gastos"]
    Telegram["Adaptador de Telegram"] --> App
    App --> Port["Puerto ExpenseStore"]
    PG["Adaptador PostgreSQL"] -. "implementa" .-> Port
~~~

El diagrama ilustra un posible puerto de persistencia, no una obligación de crearlo antes de que aporte valor. Los adaptadores de entrada invocan capacidades de aplicación; los de salida implementan capacidades que la aplicación necesita.

La aplicación debe depender de abstracciones que representen capacidades cuando aíslen un límite significativo.
Los adaptadores de infraestructura implementan esas capacidades.

No crees interfaces solo por flexibilidad teórica.
Creá un puerto cuando exista un límite real. La importación de transacciones externas podrá introducir una capacidad TransactionSource cuando esa función exista.

## 6. Estrategia de pruebas

La técnica de prueba depende del problema.

### Lógica de dominio

Preferí TDD donde haya reglas de negocio:
ROJO → VERDE → REFACTORIZAR.

Ejemplos:
- validación de gastos;
- manejo de montos;
- reglas de categorización;
- detección de duplicados;
- puntuación de conciliación.

Escribí primero una prueba que falle por la regla buscada, implementá el comportamiento válido más pequeño y refactorizá mientras las pruebas sigan pasando.

### Infraestructura

Usá pruebas de integración para:
- repositorios y operaciones de persistencia;
- rutas HTTP;
- adaptadores de API externas;
- análisis de actualizaciones de mensajería.

Simulá servicios externos solo en límites significativos. Verificá la persistencia contra una base real y aislada para pruebas. Ninguna prueba automatizada puede vaciar la base normal de desarrollo.

### Interfaz

Probá comportamientos importantes del usuario.
Evitá verificar detalles triviales de implementación.

Preferí «El usuario puede crear un gasto» a «El componente React tiene una variable de estado llamada amount».
No uses TDD para un ajuste trivial de espaciado o estilo.

### Del comportamiento observable hacia adentro

Elegí el incremento desde el comportamiento observable del usuario y aplicá TDD desde el interior para sus reglas de dominio importantes.
Conectá esa lógica con persistencia, HTTP e interfaz; luego verificá el recorrido completo.
La implementación desde el interior y la entrega por incrementos verticales resuelven problemas distintos y pueden combinarse.

## 7. Comportamiento de IA

El comportamiento de un LLM no debe tratarse como lógica de negocio determinista.

Por ejemplo, un agente puede interpretar «gasté 15 lucas en una pizza ayer».
Pero la creación efectiva del gasto debe pasar por código de aplicación determinista.

~~~mermaid
flowchart TD
    Text["Texto del usuario"] --> Agent["Agente"]
    Agent --> Tool["Llamada a herramienta estructurada"]
    Tool --> Validate["Validación"]
    Validate --> App["Operación de aplicación"]
    App --> Rules["Reglas de dominio"]
    App --> DB["Persistencia"]
~~~

El LLM nunca debe modificar directamente la base ni ejecutar SQL arbitrario.

La identidad del usuario o de la cuenta no debe formar parte de los argumentos elegidos por el modelo; cuando existan cuentas, el contexto de ejecución confiable determinará la propiedad.
No inventes datos obligatorios desconocidos.

## 8. Herramientas

Las herramientas del agente son capacidades de la aplicación expuestas al modelo.

Ejemplos:
- create_expense;
- update_expense;
- search_expenses;
- delete_expense;
- get_spending_summary.

Las herramientas deben:
- tener esquemas explícitos;
- validar la entrada;
- realizar una operación clara;
- devolver resultados estructurados;
- mantener comportamiento determinista siempre que sea posible.

Los permisos, la propiedad y la validación de negocio pertenecen al código confiable, no solo a las instrucciones del modelo.
Las herramientas reutilizan operaciones de aplicación; no crean una implementación paralela de la lógica de gastos.

## 9. Evaluaciones de IA

El comportamiento del agente requiere evaluaciones además de las pruebas tradicionales.

Ejemplo:

~~~text
Entrada:
«gasté 8500 en YPF»

Esperado:
amount = 8500 pesos (850000 centavos enteros al llamar la operación de gastos)
merchant = YPF
category = FUEL
~~~

Otro:

~~~text
Entrada:
«ayer pagué 18 lucas de cena en efectivo»

Esperado:
amount = 18000 pesos
paymentMethod = CASH
date = ayer en la zona horaria del usuario
~~~

Los conjuntos de evaluación crecerán a partir de fallas reales descubiertas durante el uso de la aplicación.
Una regresión hallada en producción debe convertirse en una prueba automatizada tradicional o en una evaluación del agente.

Empezá las evaluaciones con la primera función del agente. Incluí entradas ambiguas, datos obligatorios faltantes, argumentos de herramienta inválidos, límites de fecha y casos de duplicación o reintento. Fijá fechas y contexto de referencia para que los ejemplos sean reproducibles.

Medí los campos estructurados y las operaciones elegidas frente al comportamiento esperado. Registrá versiones de modelo, instrucciones y herramientas, así como costo y latencia, cuando se introduzcan esas funciones.
Que un conjunto de evaluación pase es evidencia dentro de ese conjunto, no una garantía de corrección universal.

## 10. Flujo de Git

Usá desarrollo basado en una rama principal.
Rama principal: main.

Trabajá en ramas de vida muy corta cuando el aislamiento o la revisión resulten útiles.
Ejemplo: feature/create-expense.

Ciclo esperado:
main → rama pequeña → implementación → pruebas → revisión → integración.

Normalmente, una rama debe durar horas y no semanas.
Evitá ramas develop, integration o release-next de larga duración, salvo que aparezca una necesidad real.

Inicializar Git localmente es distinto de crear un repositorio en GitHub.
Solo se realizan operaciones remotas, push o despliegues cuando se solicitan. No sobrescribas un repositorio existente ni crees uno anidado en silencio.

## 11. Integración continua

Todo cambio integrado en main debe dejar el repositorio funcionando.

La integración continua debe ejecutar:
~~~bash
npm run lint
npm run typecheck
npm test
npm run build
~~~

Las funciones con persistencia agregan verificación de integración aislada y obligatoria; el primer recorrido de interfaz agrega una prueba de extremo a extremo.
Una falla en main tiene prioridad sobre trabajo nuevo.

Durante la documentación y la inicialización todavía no existen pruebas de negocio. Declará esa situación con claridad y configurá el ejecutor sin inventar cobertura. Durante la inicialización, la integración continua puede omitir explícitamente una suite vacía; la primera función incorpora pruebas reales obligatorias.

Crear localmente una definición de integración continua no significa que GitHub la haya ejecutado.
Informá los resultados locales por separado de los remotos.

## 12. Commits

Los commits deben ser pequeños y coherentes.
Cada uno debe representar un cambio comprensible.

Ejemplos:
~~~text
feat: agregar creación de gastos
test: validar rechazo de montos negativos
feat: guardar gastos en postgres
fix: rechazar mensajes de telegram mal formados
~~~

No crees commits con cambios no relacionados.
Revisá el diff y protegé el trabajo previo que todavía no se haya registrado.
Hacé un commit solo cuando la tarea activa lo autorice; en caso contrario, entregá un mensaje sugerido y cambios revisables.

## 13. Flujo de desarrollo con Codex

Codex es un colaborador de ingeniería, no un generador automático de código.

Para toda tarea no trivial:

### Paso 1 — Definir la tarea

Describí el cambio como una incidencia de GitHub.
Incluí contexto, comportamiento deseado, alcance, exclusiones y criterios de aceptación.

### Paso 2 — Pedir un plan

Antes de modificar código, Codex debe:
1. inspeccionar el código relevante;
2. identificar los componentes afectados;
3. proponer un plan de implementación;
4. identificar riesgos o supuestos.

En tareas suficientemente pequeñas, este paso puede ser implícito.

### Paso 3 — Revisar el plan

El desarrollador comprueba:
- si la solución encaja en la arquitectura;
- si se introducen abstracciones innecesarias;
- si el alcance sigue siendo pequeño.

Una solicitud solo de planificación termina aquí.
Una solicitud explícita de implementar una tarea ya delimitada autoriza esa tarea; el agente puede explicar su plan y avanzar sin exigir una segunda aprobación para pasos rutinarios.

La instrucción inicial de arranque autorizó únicamente initialize-project. Pidió un plan, no la implementación, para create-expense.

### Paso 4 — Implementar

Codex implementa solo la tarea autorizada.
No debe incorporar automáticamente funciones adyacentes.

### Paso 5 — Verificar

Codex debe ejecutar las pruebas pertinentes, el verificador de tipos, el linter y la compilación.
La verificación aprobada forma parte de la definición de terminado.
Informá los comandos realmente ejecutados, sus resultados y los controles indisponibles; no presentes un control bloqueado como aprobado.

### Paso 6 — Revisión humana

El desarrollador revisa el diff y debe poder explicar:
- qué cambió;
- por qué cambió;
- cómo fluyen los datos por la función;
- qué pruebas lo verifican;
- qué decisiones de arquitectura se introdujeron.

El código incomprensible no debe integrarse solo porque funcione.

### Paso 7 — Commit

Creá un commit pequeño y coherente cuando esté autorizado.
Después continuá con la siguiente tarea.

## 14. Organización del contexto

La información persistente debe quedar en el documento apropiado.

| Documento | Propósito |
| --- | --- |
| README.md | Presentación del proyecto, estado real, configuración e instrucciones de ejecución |
| AGENTS.md | Instrucciones operativas breves, reglas de arquitectura, comandos y criterios de finalización |
| docs/product.md | Problema, usuarios, principios de producto y requisitos de funciones |
| docs/architecture.md | Módulos, dependencias, sistemas externos y decisiones de diseño principales |
| docs/decisions/ | Decisiones breves con contexto y consecuencias |
| docs/features/ | Especificaciones de funciones no triviales |
| prompts/ | Instrucciones reutilizables que remiten al contexto del repositorio |

Mantené AGENTS.md breve: no debe copiar toda esta metodología.

Ejemplos de decisiones:
- 001-modular-monolith.md;
- 002-telegram-before-whatsapp.md;
- 003-money-as-integer.md;
- 005-telegram-local-polling.md.

Ejemplos de especificaciones:
- create-expense.md;
- telegram-expense-entry.md;
- mercadopago-import.md, después de investigar proveedor y datos.

Documentá decisiones y comportamientos reales. Distinguí lo implementado, las tareas actuales y las ideas de la hoja de ruta.
No crees un armazón grande ni especificaciones futuras especulativas antes de que resuelvan un problema concreto.

## 15. Definición de terminado

Una tarea está terminada cuando:
- cumple sus criterios de aceptación;
- pasan las pruebas automatizadas pertinentes;
- pasa la verificación de tipos;
- pasa el linter;
- la aplicación compila;
- la arquitectura sigue siendo coherente;
- se actualiza la documentación cuando es necesario;
- no se incluyen cambios ajenos;
- el desarrollador comprende la implementación resultante.

Para funciones de IA, también deben pasar las evaluaciones pertinentes.

Aplicá los controles existentes y pertinentes para cada tarea. Los cambios solo de Markdown requieren verificar enlaces y coherencia, no una compilación de aplicación que no corresponde.
En la inicialización o en entornos bloqueados, informá qué se verificó y qué queda pendiente; una limitación no se omite en silencio.
Ninguna integración se justifica con afirmaciones de éxito sin respaldo.

## 16. Evitar complejidad prematura

No introduzcas tecnologías solo porque algún día podrían ser útiles.

Al inicio evitá:
- microservicios;
- buses de eventos;
- Kubernetes;
- Redis;
- bases vectoriales;
- varios agentes de IA;
- CQRS;
- event sourcing;
- abstracciones complejas de repositorios;
- sistemas genéricos de plugins.

Incorporalos únicamente cuando un problema concreto los justifique.

## 17. Principio rector

Preferí software sencillo, observable, comprobable, reemplazable y comprensible.
No optimices para la astucia, la generalidad, las promesas de preparación para el futuro ni el número de abstracciones.

El sistema debe sofisticarse solo a medida que se sofistiquen los problemas que resuelve.

Este archivo adapta a la documentación del repositorio la metodología conversada y editada con Tomás. Los detalles propios del proyecto resuelven ambigüedades sin alterar su enfoque de desarrollo incremental.
