# Función — Editar un gasto manual

Estado: implementada localmente.

Un gasto manual existente puede editarse desde la lista. El formulario comienza con el monto, la fecha civil, la categoría, el medio de pago, el comercio y la descripción guardados. Guardar reemplaza los seis valores editables; cancelar deja el registro intacto.

La aplicación valida todos los datos con las mismas reglas de creación. `PUT /api/expenses/{id}` devuelve el DTO actualizado; ante datos inválidos devuelve 400 con errores por campo, ante un id inexistente o mal formado devuelve 404 y ante fallas inesperadas devuelve un mensaje genérico con 500. El backend conserva id, moneda, origen y marca de creación; `updatedAt` cambia cuando la edición se guarda correctamente.

Después de guardar, la lista y el total del mes actual se vuelven a consultar en PostgreSQL. Cambiar la fecha a otro mes afecta el total que corresponde. Una solicitud fallida conserva los valores del formulario y no afirma que la edición se haya guardado.

Verificación: las pruebas de dominio siguen cubriendo la validación; las de integración comprueban actualización y lectura, campos inmutables, datos inválidos, registros inexistentes y cambios de total; una prueba de navegador edita un gasto y vuelve a cargarlo.
