# UrbanSprout - Estructura de la aplicacion web

## 1) Vista general

UrbanSprout es una app en **Next.js (App Router) + TypeScript** con estas capas principales:

1. **UI y rutas** en `src/app`
2. **Componentes reutilizables** en `src/components`
3. **Logica de negocio e integraciones** en `src/lib`
4. **Proteccion de rutas** en `src/proxy.ts`

---

## 2) Estructura por carpetas

```text
src/
  app/
    page.tsx                      -> landing + catalogo
    dashboard/page.tsx            -> panel de cliente (y estado de pago)
    admin/page.tsx                -> vista admin
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
    api/checkout/route.ts         -> endpoint para crear sesion de Stripe
    layout.tsx                    -> layout global
    globals.css                   -> estilos globales
  components/
    checkout-button.tsx           -> boton cliente para iniciar compra
  lib/
    catalog.ts                    -> productos del catalogo
    roles.ts                      -> resolucion de rol (cliente/admin)
    stripe.ts                     -> wrapper interno de Stripe
    env.ts                        -> validacion de variables de entorno
  proxy.ts                        -> middleware de Clerk para proteger rutas
```

---

## 3) Flujo funcional principal

### Landing y compra

1. El usuario entra a `/` y ve productos desde `lib/catalog.ts`.
2. `CheckoutButton` llama `POST /api/checkout` con `productId`.
3. `api/checkout/route.ts` valida:
   - Clerk configurado
   - Stripe configurado
   - usuario autenticado
   - producto valido
4. Se crea la sesion con `InternalStripeSDK` (`lib/stripe.ts`) y se redirige a Stripe Checkout.
5. Stripe devuelve a `/dashboard?payment=success` o `?payment=cancelled`.

### Autenticacion y acceso

- `proxy.ts` protege `/dashboard` y `/admin` usando Clerk.
- `roles.ts` decide el rol:
  - `admin` por metadata de Clerk (`role=admin`) o por email incluido en `ADMIN_EMAILS`.
  - si no, `cliente`.

### Vista admin

- `/admin` es una vista protegida por autenticacion + rol admin.
- Si el usuario no es admin, muestra "Acceso restringido".

---

## 4) Donde modificar cada cosa

- **Catalogo y precios:** `src/lib/catalog.ts`
- **Reglas de rol/admin:** `src/lib/roles.ts` y variable `ADMIN_EMAILS` en `.env.local`
- **Comportamiento de checkout:** `src/app/api/checkout/route.ts` y `src/lib/stripe.ts`
- **Texto/estructura de pantallas:** `src/app/**/page.tsx`
- **Proteccion de rutas:** `src/proxy.ts`

---

## 5) Rutas clave

- `/` -> Home + catalogo
- `/sign-in` -> Login
- `/sign-up` -> Registro
- `/dashboard` -> Cuenta del usuario
- `/admin` -> Vista de administracion
- `/api/checkout` -> API de compra
