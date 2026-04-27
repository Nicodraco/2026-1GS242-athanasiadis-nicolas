# Plan de ejecución - UrbanSprout (basado en PRD)

## 1. Objetivo del plan

Convertir el MVP actual de UrbanSprout en una base operativa de ecommerce más completa, manteniendo foco en compras confiables, gestión mínima de pedidos y crecimiento controlado.

## 2. Enfoque general

1. Definir arquitectura obligatoria: backoffice React Vite/TanStack, API con Bun y orquestación con Docker Compose.
2. Consolidar confiabilidad del flujo actual (auth + checkout + roles).
3. Incorporar trazabilidad de órdenes con Stripe Webhooks.
4. Crear capacidades mínimas de operación interna (admin de pedidos e inventario).
5. Mejorar conversión y retención (carrito, cupones, bundles y suscripción).

## 3. Fases de trabajo

## Fase 0 - Alineación de arquitectura obligatoria

**Meta:** adaptar la solución al requisito técnico del proyecto.

### Entregables

- Backoffice admin separado en React con Vite o TanStack.
- Servicio API/data ejecutado con Bun para órdenes, inventario y webhooks.
- `docker-compose.yml` para levantar stack completo.

### Tareas clave

1. Decidir stack del backoffice (**Vite** o **TanStack**) y estandarizar estructura.
2. Diseñar contrato API compartido entre storefront y backoffice.
3. Configurar servicios en Docker Compose con variables y redes.
4. Definir estrategia de base de datos operada desde Bun.

## Fase A - Estabilización del MVP

**Meta:** reducir errores de configuración/checkout y estandarizar operación.

### Entregables

- Checklist de configuración productiva (Clerk, Stripe, URLs y variables).
- Mensajes de error consistentes para fallos de autenticación y checkout.
- Confirmación funcional de criterios de aceptación del MVP del PRD.

### Tareas clave

1. Unificar manejo de errores visibles para usuario en compra y acceso.
2. Documentar flujo operativo manual post-pago para el equipo admin.
3. Verificar reglas de rol admin por metadata y `ADMIN_EMAILS`.

## Fase B - Órdenes automáticas (Stripe Webhooks)

**Meta:** pasar de operación manual a registro automático de compras.

### Entregables

- Endpoint de webhook de Stripe con validación de firma.
- Registro persistente de órdenes (estado, producto, monto, usuario, fechas).
- Vista inicial de historial de compras en dashboard del cliente.

### Tareas clave

1. Diseñar modelo de datos de órdenes.
2. Implementar webhook para eventos de checkout exitoso/cancelado.
3. Mostrar estado y detalle básico de orden al cliente.
4. Definir estrategia de reintentos/idempotencia para eventos repetidos.

## Fase C - Backoffice operativo mínimo

**Meta:** habilitar control interno de pedidos e inventario base.

### Entregables

- Panel admin con listado de órdenes.
- Estado operativo de pedido (pendiente, preparado, enviado, entregado).
- Módulo simple de inventario por SKU con stock mínimo.

### Tareas clave

1. Crear vistas admin para consulta y actualización de pedidos.
2. Añadir alertas de stock bajo.
3. Incorporar filtros por estado, fecha y producto.

## Fase D - Optimización comercial

**Meta:** aumentar conversión y valor promedio de compra.

### Entregables

- Carrito multi-producto.
- Cupones y bundles básicos.
- Métricas de embudo (visita -> checkout -> pago exitoso).

### Tareas clave

1. Diseñar reglas de descuentos y validaciones.
2. Adaptar checkout para múltiples ítems.
3. Instrumentar eventos de analítica del embudo de compra.

## Fase E - Retención y recurrencia

**Meta:** generar recompra y relación de largo plazo.

### Entregables

- Suscripción mensual de insumos/semillas.
- Gestión básica de suscripción (alta, pausa, cancelación).
- Mensajería de seguimiento para clientes recurrentes.

### Tareas clave

1. Definir planes de suscripción iniciales.
2. Integrar cobros recurrentes en Stripe.
3. Exponer estado de suscripción en dashboard del cliente.

## 4. Priorización (alto nivel)

1. **P0:** Alineación arquitectura + estabilización MVP + webhooks.
2. **P1:** Backoffice operativo mínimo.
3. **P2:** Carrito/cupones/bundles.
4. **P3:** Suscripción y retención.

## 5. Dependencias críticas

- Configuración correcta de Clerk y Stripe en todos los entornos.
- Decisión explícita de framework admin (Vite o TanStack) antes de construir backoffice.
- Definición de Docker Compose para desarrollo y QA.
- Definición de modelo de datos para órdenes e inventario.
- Decisiones de negocio para estados de pedido, descuentos y suscripción.

## 6. KPIs de seguimiento

- Conversión visita -> checkout iniciado.
- Conversión checkout iniciado -> pago exitoso.
- Tasa de error de checkout por configuración o validación.
- Tiempo desde compra hasta despacho.
- Porcentaje de clientes recurrentes.

## 7. Riesgos de ejecución y mitigación

- **Riesgo:** eventos webhook duplicados o fuera de orden.  
  **Mitigación:** idempotencia por `event.id` y actualización transaccional.

- **Riesgo:** incremento de complejidad operativa sin backoffice suficiente.  
  **Mitigación:** priorizar panel admin antes de features comerciales avanzadas.

- **Riesgo:** caída de conversión por fricción en carrito/cupones.  
  **Mitigación:** lanzar de forma incremental y medir impacto por feature.

## 8. Definición de éxito del plan

El plan se considera exitoso cuando UrbanSprout pasa de MVP funcional a operación trazable y escalable, con órdenes registradas automáticamente, panel admin utilizable y métricas que permitan optimización continua del negocio.

