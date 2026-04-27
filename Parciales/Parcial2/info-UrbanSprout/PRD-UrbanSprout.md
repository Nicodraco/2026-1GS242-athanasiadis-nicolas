# PRD - UrbanSprout (Ecommerce B2C)

## 1. Resumen del producto

**UrbanSprout** es una aplicación web de ecommerce B2C para vender kits compactos de cultivo urbano a personas con espacios reducidos (apartamentos y zonas con acceso limitado para sembrar).  
La plataforma permite descubrir productos, autenticarse, comprar con Stripe y consultar un panel de usuario, con una vista administrativa básica para gestión operativa.

## 2. Problema a resolver

Personas interesadas en cultivar en casa suelen enfrentar:

- Falta de espacio y conocimiento inicial.
- Dificultad para conseguir insumos adecuados en un solo lugar.
- Experiencias de compra poco claras para kits de iniciación.

UrbanSprout busca reducir esa fricción con kits listos para empezar y una experiencia de compra simple.

## 3. Objetivos de negocio

1. Validar demanda inicial de kits urbanos en modelo D2C.
2. Habilitar un flujo end-to-end de compra autenticada.
3. Mantener una operación inicial liviana con catálogo corto y administración mínima.

## 4. Objetivos de producto

1. Ofrecer una landing clara con propuesta de valor y catálogo.
2. Permitir registro/login con Clerk.
3. Procesar pagos mediante Stripe Checkout.
4. Mostrar estado de pago y acceso por rol en dashboard.
5. Restringir la vista administrativa a usuarios admin.

## 5. Alcance (MVP actual)

### Incluido

- Landing con CTA principal: **"Empezar a cultivar hoy"**.
- Catálogo de 3 kits con precio en USD.
- Autenticación con Clerk (sign-in/sign-up).
- Checkout vía `POST /api/checkout` y redirección a Stripe.
- Dashboard con estado de pago (`success`/`cancelled`).
- Rol `admin` por metadata o variable `ADMIN_EMAILS`.
- Ruta `/admin` protegida por autenticación y autorización.

### Fuera de alcance (por ahora)

- Gestión de órdenes dentro de la app.
- Webhooks y conciliación automática de pagos.
- Inventario en tiempo real.
- Carrito multi-producto y cupones.
- Suscripciones y recompensas.

## 6. Usuarios y roles

- **Visitante:** navega landing y catálogo, se registra/inicia sesión.
- **Cliente:** compra kits y consulta su panel.
- **Admin:** accede a vista administrativa básica.

## 7. Requerimientos funcionales

1. La home debe listar productos desde una fuente central (`catalog`).
2. El botón de compra debe iniciar checkout para un `productId` válido.
3. El API de checkout debe rechazar compra si:
   - Clerk no está configurado.
   - Stripe no está configurado.
   - El usuario no está autenticado.
   - El producto no existe.
4. El checkout debe redirigir a `/dashboard?payment=success|cancelled`.
5. El dashboard debe reflejar rol y estado de pago.
6. `/dashboard` y `/admin` deben estar protegidas.
7. `/admin` debe mostrar acceso restringido a no-admin.

## 8. Requerimientos no funcionales

- **Seguridad:** rutas sensibles protegidas; control de acceso por rol.
- **Configurabilidad:** comportamiento basado en variables de entorno.
- **Mantenibilidad:** separación por capas (`app`, `components`, `lib`).
- **UX base:** mensajes claros ante errores de configuración o checkout.

## 9. Requerimientos técnicos obligatorios (actualizados)

1. **Backoffice admin independiente:** el módulo administrativo debe implementarse como aplicación separada en **React con Vite o TanStack**.
2. **Orquestación con Docker Compose:** el entorno local y de integración debe ejecutarse con `docker-compose` (servicios de frontend, backend/API y base de datos).
3. **Pagos y autenticación:** mantener **Stripe** para cobros y **Clerk** para autenticación/autorización.
4. **Persistencia con Bun:** la capa de base de datos debe estar integrada en un servicio ejecutado con **Bun**, incluyendo acceso a órdenes, inventario y eventos de webhook.
5. **Integración entre apps:** el storefront actual y el backoffice deben consumir una API común para mantener consistencia de datos.

## 10. Métricas de éxito (MVP)

- Tasa de conversión visita -> checkout iniciado.
- Tasa de checkout iniciado -> pago exitoso.
- Tiempo promedio para completar primera compra.
- Porcentaje de errores de checkout por configuración.

## 11. Riesgos y mitigaciones

- **Riesgo:** llaves inválidas de Clerk/Stripe en despliegue.  
  **Mitigación:** validaciones explícitas y mensajes de error.

- **Riesgo:** asignación incorrecta de admins por email/metadata.  
  **Mitigación:** normalización de emails y doble mecanismo de rol.

- **Riesgo:** operación manual post-pago.  
  **Mitigación:** usar dashboard de Stripe mientras se implementan webhooks.

- **Riesgo:** desalineación entre storefront y backoffice separado.  
  **Mitigación:** contrato API único, versionado y validación de esquemas.

- **Riesgo:** complejidad de entorno por multi-servicio.  
  **Mitigación:** Docker Compose con perfiles y documentación de arranque único.

## 12. Roadmap recomendado

1. Definir arquitectura target (Backoffice React Vite/TanStack + API Bun + Docker Compose).
2. Integrar webhooks de Stripe para registrar órdenes.
3. Implementar historial de compras en dashboard.
4. Añadir backoffice de pedidos e inventario.
5. Incorporar carrito, cupones y bundles.
6. Lanzar suscripción mensual de insumos.

## 13. Criterios de aceptación del MVP

1. Usuario autenticado puede comprar un kit y completar pago en Stripe.
2. Al volver de Stripe, dashboard muestra estado correcto de transacción.
3. Usuario no autenticado no puede comprar ni acceder a `/dashboard`.
4. Usuario no admin no puede acceder al panel admin.
5. Errores de configuración de Clerk/Stripe son visibles y accionables.
6. El backoffice admin corre como app separada en React Vite/TanStack.
7. El stack completo levanta con Docker Compose.

