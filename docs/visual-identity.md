# Identidad visual de GastoBot

## Idea

GastoBot se presenta como un cuaderno cotidiano para anotar gastos y volver a mirarlos con calma. La interfaz usa un tono argentino cercano y directo, sin convertir el registro personal en un tablero financiero complejo.

## Elementos

- **Marca:** un recibo dibujado con SVG propio representa el acto de registrar. La forma se repite de manera abstracta en la cabecera y se usa como ícono de la pestaña.
- **Color:** crema `#f8f4eb` como fondo, terracota `#ad4e36` para acciones, marrón `#33291f` para texto y oliva `#3f4638` para el total. El verde suave `#e9ecdc` distingue los filtros.
- **Tipografía:** `Trebuchet MS` con alternativas del sistema. Sus formas redondeadas aportan cercanía sin depender de una fuente remota.
- **Jerarquía:** cabecera de marca, formulario para anotar, filtros para explorar, total y movimientos. La numeración 01/02 ayuda a orientarse; los importes y estados conservan prioridad visual.
- **Lenguaje:** verbos concretos como «Anotá» y «Encontrá». Las etiquetas de campos y acciones existentes siguen siendo explícitas.

## Implementación

La identidad vive en `src/app/globals.css`, `src/app/icon.svg`, `src/modules/expenses/ui/ExpenseDashboard.module.css` y el encabezado de `ExpenseDashboard.tsx`. El símbolo se dibuja en SVG y no requiere imágenes, servicios ni fuentes externas. Los estilos incluyen estados de foco visibles, diseño adaptable a pantallas pequeñas y reducción de movimiento según la preferencia del sistema.
