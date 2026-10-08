# Instrucción 02 — Planificar la creación de gastos

Leé AGENTS.md, docs/product.md, docs/architecture.md,
docs/development-methodology.md, las decisiones relevantes y docs/features/create-expense.md.

Inspeccioná el repositorio actual y verificá qué dejó listo la inicialización.

No modifiques archivos ni implementes todavía. Proponé un plan pequeño para el primer incremento vertical: crear un gasto manual, guardarlo y mostrarlo en la lista mínima con el total del mes actual.

Explicá:
- archivos a agregar o modificar y responsabilidad de cada uno;
- recorrido formulario → HTTP → aplicación → reglas → PostgreSQL → respuesta/UI;
- validación exacta de dinero y manejo de fechas de Buenos Aires;
- contrato de DTO y conversión de bigint;
- pruebas de dominio, integración y navegador necesarias;
- comandos de verificación y cambios de CI;
- supuestos, riesgos y decisiones nuevas.

Usá TDD en las reglas relevantes y evitá abstracciones sin una necesidad concreta. Respetá la especificación; edición, eliminación, agentes e integraciones quedan para otras tareas.
