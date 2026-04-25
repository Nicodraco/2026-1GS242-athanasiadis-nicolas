# Parcial #2 - Ecommerce B2C (UrbanSprout)

Aplicación web en **TypeScript + Next.js** para vender kits pequeños de cultivo orientados a personas en apartamentos y zonas con acceso limitado para sembrar.

## Incluye

1. **Landing page** con CTA principal: `Empezar a cultivar hoy`.
2. **Autenticación con Clerk** (Google, Microsoft y OTP vía configuración de Clerk).
3. **Checkout con Stripe** usando un wrapper interno (`InternalStripeSDK`).
4. **Tipos de usuario**:
   - `cliente` (por defecto)
   - `admin` (si email está en `ADMIN_EMAILS` o metadata de Clerk)

## Configuración rápida

1. Copia `.env.example` a `.env.local`.
2. Configura tus llaves de Clerk y Stripe.
3. En Clerk, habilita proveedores:
   - Google
   - Microsoft
   - OTP (Email / Phone según tu setup)
4. Instala dependencias y ejecuta:

```bash
npm install
npm run dev

# pruebas e2e
npm run test:e2e
```

## Rutas principales

- `/` Landing + catálogo.
- `/sign-in` Login Clerk.
- `/sign-up` Registro Clerk.
- `/dashboard` Panel del cliente.
- `/admin` Vista admin (protegida por rol).
- `/api/checkout` Endpoint para crear sesión de Stripe.
