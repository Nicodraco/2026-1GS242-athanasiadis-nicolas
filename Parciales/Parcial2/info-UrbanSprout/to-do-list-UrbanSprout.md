# To-Do List - UrbanSprout

Basado en el PRD, el plan de ejecución y la estrategia de agentes/habilidades.

## P0 (crítico)

1. [ ] Decidir framework de backoffice: React + Vite o React + TanStack.
2. [ ] Separar backoffice admin en app independiente.
3. [ ] Definir servicio/API con Bun para persistencia de órdenes e inventario.
4. [ ] Crear `docker-compose.yml` para orquestar storefront, backoffice, API y base de datos.
5. [ ] Auditar configuración base de Clerk/Stripe por entorno.
6. [ ] Estandarizar mensajes de error en auth, checkout y rutas protegidas.
7. [ ] Verificar reglas de rol admin (`metadata` + `ADMIN_EMAILS`).
8. [ ] Crear endpoint de webhook Stripe con validación de firma.
9. [ ] Definir modelo de datos de órdenes.
10. [ ] Implementar idempotencia para eventos webhook (`event.id`).
11. [ ] Mostrar historial de compras en dashboard del cliente.

## P1 (operación)

1. [ ] Crear módulo admin para listar órdenes.
2. [ ] Permitir actualización de estado operativo del pedido.
3. [ ] Agregar filtros admin por estado, fecha y producto.
4. [ ] Implementar inventario mínimo por SKU con alerta de stock bajo.

## P2 (crecimiento comercial)

1. [ ] Implementar carrito multi-producto.
2. [ ] Adaptar checkout para múltiples `line_items`.
3. [ ] Agregar cupones y bundles básicos.
4. [ ] Instrumentar analítica de embudo (visita -> checkout -> pago).

## P3 (retención)

1. [ ] Definir planes iniciales de suscripción mensual.
2. [ ] Integrar cobro recurrente en Stripe.
3. [ ] Mostrar estado de suscripción en dashboard de cliente.

## Cierre por fase

1. [ ] Ejecutar lint, build y e2e al cerrar cada bloque funcional.
2. [ ] Ejecutar code-review de cambios críticos (roles, seguridad, pagos).
3. [ ] Actualizar PRD/plan si cambia alcance o prioridades.

## Agentes y habilidades sugeridas

- Implementación: `general-purpose`
- Validación técnica: `task`
- Revisión de riesgos: `code-review`
- Investigación transversal: `explore`
- Diseño UI/UX: `frontend-design`
- Setup de entorno cloud: `customize-cloud-agent`

## Restricciones técnicas obligatorias

- Backoffice admin en React Vite o TanStack.
- Docker Compose para levantar el stack.
- Stripe para pagos.
- Clerk para autenticación y control de acceso.
- Bun para la capa de datos/base de datos.

