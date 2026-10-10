# ADR 006 — Título del gasto y resumen por período

Estado: aceptada el 2026-10-10.

## Contexto

El bot guiado guardaba comercio y descripción, pero la web usaba el comercio como encabezado. Esto impedía darle un nombre libre al gasto sin perder el dato del comercio. Además, la web requería recargar para ver gastos ingresados por Telegram y el total mensual no seguía los filtros de la lista.

## Decisión

- Agregar `title` anulable de hasta 120 caracteres a `expenses`, sin copiar automáticamente `merchant` a las filas existentes. El título es independiente del comercio.
- Mostrar `title`, luego `merchant` y por último la categoría como encabezado de la lista. El formulario web permite crear y editar ambos campos.
- Preguntar el título en `/registrar_gasto` después de la fecha y antes del comercio. Es opcional, aparece en la revisión y se puede corregir. `/gasto` admite `--titulo`.
- La web abre en el mes actual de Buenos Aires. Permite elegir un mes, ayer, los últimos 7 días, los últimos 365 días o dos fechas inclusivas. El total y la lista usan el mismo período y categoría; el total agrega todas las páginas.
- La pestaña visible consulta cada cinco segundos y al recuperar el foco para reflejar registros creados fuera de la web. La consulta no modifica el formulario ni la selección actual.

## Consecuencias

La columna nueva requiere una migración aditiva y generación del cliente Prisma. Los gastos anteriores conservan su comercio y siguen teniendo un encabezado legible. La API mantiene `currentMonthTotalCents` para compatibilidad y agrega `rangeTotalCents` para el resumen filtrado. La consulta periódica añade tráfico local de lectura; se detiene mientras la pestaña está oculta. Los borradores de Telegram siguen viviendo solo en memoria.
