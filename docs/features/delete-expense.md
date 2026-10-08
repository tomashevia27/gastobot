# Función — Eliminar un gasto manual

Estado: implementada localmente.

La lista ofrece una acción de eliminación con confirmación en la misma vista. Cancelar deja el registro intacto. Confirmar elimina el gasto de forma permanente en esta versión local para una sola persona.

`DELETE /api/expenses/{id}` devuelve 204 después de eliminar, 404 ante un id inexistente o mal formado y un mensaje genérico con 500 ante fallas inesperadas. La interfaz vuelve a consultar la lista y el total del mes actual tras el éxito; ante una falla mantiene visible el gasto y muestra un error.

Verificación: las pruebas de integración comprueban ids existentes e inexistentes y el total persistido; una prueba de navegador verifica cancelar, confirmar y recargar. Las pruebas usan exclusivamente la base destinada a ellas.
