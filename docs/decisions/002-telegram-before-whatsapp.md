# ADR 002 — Telegram antes que WhatsApp

Estado: orden de la hoja de ruta aceptado; Telegram se implementó localmente en v0.2 y WhatsApp sigue pendiente.
Fecha: 2026-10-06.

## Contexto

El hábito buscado es enviar un mensaje breve para registrar un gasto. Empezar con varios proveedores de mensajería distraería del aprendizaje del flujo básico de HTTP y persistencia.

## Decisión

Terminar primero las operaciones manuales en la web. Incorporar Telegram como primer canal de mensajería.
Comenzar con comandos deterministas y luego agregar interpretación de lenguaje natural mediante herramientas validadas.
Incorporar WhatsApp solo después de que Telegram y el flujo del agente sean confiables y se investiguen sus requisitos oficiales de integración.

## Consecuencias

En v0.1 no hicieron falta credenciales de bot ni un endpoint de webhook. La v0.2 usa un proceso local de Telegram, según [ADR 005](005-telegram-local-polling.md).
Las operaciones de gastos deben seguir siendo reutilizables, sin quedar acopladas a una solicitud HTTP ni a un chat.
La decisión no presupone acceso a un chat personal de WhatsApp ni promete precios o disponibilidad futuros del proveedor.
