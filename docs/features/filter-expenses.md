# Función — Filtrar gastos y navegar por la lista

Estado: implementada localmente.

La lista de gastos puede filtrarse por un mes calendario (`AAAA-MM`) y una categoría. Ambos filtros son opcionales y se combinan cuando se eligen. Por defecto se muestran todas las fechas y categorías. Los resultados mantienen el orden existente: fecha de ocurrencia descendente, hora de creación descendente y finalmente id.

`GET /api/expenses` acepta `month`, `category` y `page` desde 1. Los parámetros inválidos, repetidos o desconocidos devuelven 400. El backend devuelve hasta 20 registros por página, el número de registros filtrados, la página actual y si existe otra página. Los controles anterior y siguiente permiten navegar. Una búsqueda sin resultados tiene un mensaje distinto al de una base sin gastos.

La tarjeta de resumen conserva el total del mes actual de Buenos Aires para todas las categorías, independientemente de los filtros de la lista. Crear, editar o eliminar un registro vuelve a consultar en PostgreSQL la página seleccionada y el resumen.

Verificación: las pruebas unitarias cubren reglas de consulta y límites de calendario; las de integración comprueban filtros combinados, orden, recuento y paginación; una prueba de navegador cambia filtros y navega por los resultados.
