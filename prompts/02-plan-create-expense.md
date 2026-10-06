Leé AGENTS.md, docs/product.md, docs/architecture.md,
docs/development-methodology.md, los ADRs relevantes y docs/features/create-expense.md.

Inspeccioná el repositorio actual y verificá qué dejó listo la inicialización.

No modifiques archivos ni implementes todavía. Proponé un plan pequeño para la primera vertical slice: crear un gasto manual, persistirlo y mostrarlo en la lista mínima con el total del mes actual.

Explicá:
- archivos a agregar o modificar y responsabilidad de cada uno;
- recorrido formulario → HTTP → aplicación → reglas → PostgreSQL → respuesta/UI;
- validación exacta de dinero y manejo de fechas de Buenos Aires;
- contrato de DTOs y conversión de bigint;
- tests de dominio, integración y browser necesarios;
- comandos de verificación y cambios de CI;
- supuestos, riesgos y decisiones nuevas.

Usá TDD en las reglas relevantes y evitá abstracciones sin una necesidad concreta. Quedate dentro de la spec; edición, eliminación, agentes e integraciones quedan para otras tareas.
