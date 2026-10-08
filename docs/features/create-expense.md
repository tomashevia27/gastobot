# Función — Crear un gasto manual

Estado: implementada localmente; las verificaciones y la configuración están en README.md.
Requisito previo: inicialización del proyecto terminada.

La lista filtrada incorporada después muestra 20 registros por página. Un gasto guardado con fecha anterior puede aparecer en otra página; los filtros por mes y categoría ayudan a encontrarlo.

## Historia de usuario

Como Tomás, quiero registrar un gasto desde la web para conservarlo y ver el total de mi mes.

## Alcance del primer incremento

Formulario, operación HTTP validada, lógica de aplicación, persistencia en PostgreSQL, lista mínima y total del mes actual. La lista y el total cierran el ciclo de confirmación de la creación; no constituyen un panel de control completo.

La edición, eliminación, filtros, gráficos, autenticación, mensajería, importaciones e IA quedaron fuera de este primer incremento.

## Contrato del formulario

| Campo | Comportamiento |
| --- | --- |
| amount | Cadena ARS obligatoria con formato local; positiva y con hasta dos cifras decimales |
| currency | Solo ARS; valor fijo en la interfaz |
| occurredOn | Fecha AAAA-MM-DD obligatoria; valor inicial: hoy en la zona horaria del usuario |
| category | Enumeración fija; valor inicial UNCATEGORIZED |
| paymentMethod | Enumeración válida obligatoria; comienza sin selección |
| merchant | Cadena opcional sin espacios exteriores, hasta 120 caracteres |
| description | Cadena opcional sin espacios exteriores, hasta 500 caracteres |

Los códigos y etiquetas están en docs/product.md.
Las cadenas opcionales vacías se vuelven nulas. Se quitan los espacios exteriores.
El backend asigna id, source=MANUAL_WEB y marcas de tiempo.

### Gramática exacta del monto

Después de quitar los espacios exteriores:
- Sin separadores de miles: uno o más dígitos decimales, seguidos opcionalmente por una coma y una o dos cifras decimales.
- Con separadores de miles: el primer grupo tiene entre uno y tres dígitos; cada grupo siguiente, separado por punto, tiene exactamente tres; al final puede haber una coma y una o dos cifras decimales.
- No se admiten signo, símbolo de moneda, exponente, separador final, espacios internos ni otro texto.
- Se admiten ceros iniciales; la regla de monto positivo sigue vigente.
- Una sola cifra decimal se completa a dos.
- Centavos enteros válidos: mínimo 1, máximo 99.999.999.999.

| Entrada | Resultado esperado |
| --- | --- |
| 8500 | 850000 centavos |
| 8.500 | 850000 centavos |
| 8500,50 | 850050 centavos |
| 8.500,50 | 850050 centavos |
| 8,5 | 850 centavos |
| 0,01 | 1 centavo |
| 999.999.999,99 | 99999999999 centavos |
| vacío / 0 / -10 | Rechazado |
| 1234.56 / 1.23 / 1,234 / 1e3 | Rechazado |
| 1.000.000.000 | Rechazado: supera el máximo |

Esta regla deliberada de formato local evita interpretaciones alternativas silenciosas. Mostrá un ejemplo junto al campo.

### Reglas de fecha

Validá que la fecha exista en el calendario, incluidos los años bisiestos. Rechazá fechas imposibles como 2026-02-30.
El valor inicial «hoy» y el rango del mes actual usan America/Argentina/Buenos_Aires aunque el servidor funcione en UTC.
Se acepta una fecha pasada o futura válida; no se estableció otra restricción de fecha.

## Comportamiento HTTP

- POST /api/expenses acepta solo campos editables del formulario; nunca confía en origen, id o marcas de tiempo enviados por el cliente.
- Éxito: 201 con el DTO del gasto persistido.
- Entrada inválida: 400 con errores estructurados por campo.
- Falla inesperada del servidor o de persistencia: 500 con mensaje genérico.
- Las consultas devuelven gastos persistidos y el total del mes local actual; el plan de implementación explica la forma del endpoint.
- Los montos individuales cruzan el límite del DTO como centavos enteros; la serialización de bigint y agregados sigue el documento de arquitectura.
- PostgreSQL impone el rango positivo además de la validación del servidor.

## Criterios de aceptación

1. Enviar un gasto válido lo inserta en PostgreSQL.
2. El formulario confirma solo después de guardar correctamente.
3. El gasto guardado aparece enseguida o después de volver a consultar la lista mínima.
4. El registro sobrevive a una actualización de la página y al reinicio de la aplicación.
5. El total del mes actual usa montos persistidos en centavos enteros y límites correctos de fechas civiles.
6. Un gasto del mes anterior aparece en la lista, pero no incrementa el total del mes actual.
7. El orden es occurredOn descendente, luego createdAt descendente y finalmente id para desempates deterministas.
8. El estado vacío indica claramente que no hay gastos y muestra ARS cero para el total mensual.
9. Una entrada inválida da indicaciones útiles por campo y no escribe en la base.
10. Una falla de persistencia conserva los valores del formulario, no muestra confirmación y no agrega un registro optimista inexistente.
11. El envío se desactiva mientras está pendiente para evitar el doble clic habitual. La idempotencia completa ante reintentos de red queda pendiente en el flujo web; no se promete entrega única.
12. Los controles obligatorios tienen etiquetas y la información de errores es accesible; se puede enviar el formulario con teclado.
13. La validación del servidor funciona aunque la solicitud no pase por la interfaz.
14. No hay errores por serializar bigint sin convertir ni aritmética monetaria fraccionaria.
15. El código de dominio no depende de React, Next.js ni Prisma.
16. Los comandos de configuración, migraciones y pruebas están documentados y las verificaciones obligatorias de integración continua están habilitadas.

## Estrategia de verificación

### Pruebas de dominio, preferentemente con TDD

Análisis exacto del formato local, mínimo y máximo, formatos rechazados, validación de enumeraciones y fechas civiles reales.
Los ejemplos de límite de día y mes incluyen un instante poco después de la medianoche UTC que todavía corresponde al día anterior en Buenos Aires.

### Pruebas de integración

Usá una base PostgreSQL exclusiva para pruebas.
Verificá inserción y lectura, rechazo del servidor sin inserción, conservación de monto y fecha, y totales mensuales que cruzan límites.
Ejercitá el límite entre HTTP y aplicación y la traducción de fallas de persistencia cuando aporte valor.
No reemplaces la verificación de persistencia real únicamente por un repositorio simulado.

### Prueba de navegador

Creá un gasto desde el formulario, observá el gasto y el total, recargá y comprobá que el registro persista.
Usá datos de prueba aislados y nunca vacíes la base normal de desarrollo.

### Verificaciones requeridas

Lint, verificación de tipos, pruebas unitarias, de integración y de extremo a extremo, y compilación. Documentá los comandos exactos y la cobertura de integración continua al implementarlos.
