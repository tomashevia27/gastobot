# ADR 001 — Monolito modular

Estado: aceptada como dirección inicial del proyecto.
Fecha: 2026-10-06.

## Contexto

Un desarrollador aprende mientras construye una aplicación personal pequeña. El ingreso web, la mensajería y las futuras herramientas necesitan reglas de negocio compartidas. Los servicios independientes agregarían trabajo de despliegue, red y coordinación antes de que exista esa necesidad.

## Decisión

Usar una aplicación Next.js y PostgreSQL. Organizar el código por función de negocio. Mantener las reglas de dominio independientes de los frameworks y aislar los sistemas externos en límites significativos.

Entregar incrementos verticales. Introducir abstracciones cuando exista un acoplamiento real o una necesidad de pruebas.

## Consecuencias

La configuración local es sencilla y hay una sola unidad desplegable. Los canales pueden reutilizar las mismas operaciones de aplicación.
Los módulos son límites lógicos, no servicios que corren por separado.
Una división requiere una nueva decisión justificada por escala, aislamiento operativo o propiedad.
