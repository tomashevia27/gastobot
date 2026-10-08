# ADR 003 — Dinero como centavos enteros

Estado: aceptada.
Fecha: 2026-10-06.

## Contexto

La aritmética binaria de punto flotante puede introducir errores en cálculos de dinero decimal. La interfaz usa pesos y formato argentino; el almacenamiento debe ser exacto.

El tipo INTEGER de PostgreSQL es demasiado pequeño para el rango monetario previsto. Las representaciones enteras de Prisma y de la base también necesitan un límite explícito de serialización.

## Decisión

- Las versiones locales actuales solo admiten ARS.
- Interpretar el monto de la interfaz desde una cadena; convertir dígitos decimales enteros y fraccionarios a centavos enteros sin usar parseFloat(amount) * 100.
- Guardar los centavos como BIGINT de PostgreSQL.
- Validar cada gasto entre 1 y 99.999.999.999 centavos.
- Los valores number de la aplicación deben pasar controles de enteros seguros.
- Convertir explícitamente los bigint de la base; los montos agregados en DTO pueden ser cadenas de enteros decimales.
- Sumar unidades menores enteras; no usar redondeo de flotantes fraccionarios para reparar errores.
- Dar formato a ARS para la presentación por separado de la validación y el almacenamiento.

Se aceptan entradas locales como 8500, 8500,50 y 8.500,50.
El punto separa miles, no decimales.
Se rechazan los formatos mal formados o ambiguos, en vez de interpretar 1234.56 como otro monto.
La especificación de creación contiene ejemplos precisos de entradas válidas e inválidas.

## Consecuencias

El modelo conserva montos exactos y evita desbordamientos de centavos en PostgreSQL.
BigInt no puede pasar directamente por JSON; su conversión es parte del adaptador.
Varias monedas y sus conversiones necesitan una especificación futura.
