# Función — Filtrar gastos y navegar por la lista

Estado: implementada localmente.

La web abre con el mes actual de Buenos Aires. Se puede elegir cualquier mes calendario (`AAAA-MM`), ayer, los últimos 7 días (hoy y seis días anteriores), los últimos 365 días (hoy y 364 días anteriores) o un rango personalizado con ambas fechas incluidas. La categoría se combina con el período. La lista mantiene el orden por fecha de ocurrencia descendente, hora de creación descendente e id.

`GET /api/expenses` acepta `month` o bien `from` y `to` en formato `AAAA-MM-DD`, además de `category` y `page` desde 1. Los rangos incompletos, invertidos, inválidos, repetidos o combinados con `month` devuelven 400. La consulta sin período conserva la lista completa para compatibilidad de la API. El backend devuelve hasta 20 registros por página, el número filtrado, `rangeTotalCents` como cadena de centavos, la página actual y si existe otra página.

La tarjeta y la lista usan el mismo rango y categoría; el total incluye todos los gastos coincidentes, aun cuando haya varias páginas. `currentMonthTotalCents` conserva su significado previo en el contrato HTTP. Crear, editar o eliminar vuelve a consultar la página y los totales.

Mientras la pestaña está visible, la web vuelve a consultar los gastos cada cinco segundos y al recuperar el foco. Así aparecen los gastos creados desde Telegram sin recargar la página; el formulario en edición y los filtros activos se conservan. La pestaña oculta no genera consultas periódicas.

Verificación: las pruebas unitarias cubren reglas de consulta y límites de calendario; las de integración comprueban filtros combinados, orden, recuento y paginación; una prueba de navegador cambia filtros y navega por los resultados.
