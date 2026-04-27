# UrbanSprout coding notes

El storefront y el backoffice corren en React + Vite. No usar Next.js en nuevas implementaciones.

## UrbanSprout - agentes y habilidades recomendadas

Este proyecto usa una estrategia por fases (MVP -> webhooks -> backoffice -> optimización comercial -> retención). Para mantener calidad y velocidad:

### Agentes recomendados por tipo de trabajo

1. **general-purpose**
   - Uso: implementación de features de punta a punta.
   - Casos: Stripe webhooks, historial de órdenes, panel admin, suscripciones.

2. **task**
   - Uso: ejecución de comandos con salida acotada.
   - Casos: `npm run lint`, `npm run build`, `npm run test:e2e`.

3. **code-review**
   - Uso: revisión de cambios antes de merge.
   - Casos: validar lógica de roles, seguridad de rutas, manejo de errores en checkout/webhooks.

4. **explore**
   - Uso: investigación amplia en el codebase cuando hay varias áreas implicadas.
   - Casos: refactors de UI transversal, impacto de cambios en `app`, `lib` y `proxy`.

### Habilidades (skills) priorizadas

1. **frontend-design**
   - Uso: mejorar UI/UX de landing, dashboard, admin y futuros flujos de carrito.
   - Prioridad: fases de optimización comercial y mejoras de conversión.

2. **customize-cloud-agent**
   - Uso: preparar entorno del agente cloud con dependencias y setup repetible.
   - Prioridad: cuando se automatice la ejecución en CI/agentes remotos.

### Reglas de aplicación en UrbanSprout

- Para cambios funcionales complejos, usar `general-purpose` + `code-review`.
- Para cambios visuales, activar `frontend-design` antes de proponer UI.
- Mantener trazabilidad con PRD y plan en `info-UrbanSprout`.
