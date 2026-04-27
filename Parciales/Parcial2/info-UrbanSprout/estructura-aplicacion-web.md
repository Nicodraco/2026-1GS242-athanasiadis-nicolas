# UrbanSprout - Estructura de la aplicacion web

## 1) Vista general

UrbanSprout usa una arquitectura dividida:

1. **Storefront** en **React + Vite** (`src/`).
2. **Backoffice admin** en **React + Vite** (`admin-backoffice/`).
3. **Servicio API + datos** en **Bun** (`bun-api/`).
4. **Orquestación** de todo el stack en `docker-compose.yml`.

---

## 2) Estructura por carpetas

```text
src/                               -> storefront React + Vite
  App.tsx                          -> rutas /, /dashboard, /sign-in, /sign-up, /admin
  main.tsx                         -> bootstrap + ClerkProvider + Router
  styles.css                       -> estilos globales
  lib/
    env.ts                         -> variables y URL de backoffice
    roles.ts                       -> rol cliente/admin
    catalog.ts                     -> productos del catalogo
  components/
    checkout-button.tsx            -> compra por /api/checkout (proxy Vite)

admin-backoffice/                  -> app React + Vite para admin
  src/App.tsx                      -> ordenes e inventario

bun-api/                           -> API Bun + SQLite
  src/index.ts                     -> endpoints health/orders/inventory/webhook
  src/db.ts                        -> esquema y operaciones SQLite
```

---

## 3) Flujo funcional principal

### Landing y compra

1. El usuario entra a `/` y ve productos desde `lib/catalog.ts`.
2. `CheckoutButton` llama `POST /api/checkout` (proxy Vite) con `productId` y contexto de usuario.
3. El API Bun valida autenticación básica, producto y Stripe configurado.
4. El API crea la sesión en Stripe y devuelve URL de checkout.
5. Stripe devuelve a `/dashboard?payment=success` o `?payment=cancelled`.

### Autenticacion y acceso

- `App.tsx` implementa guards de navegación para `/dashboard`.
- `roles.ts` decide el rol:
  - `admin` por metadata de Clerk (`role=admin`) o por email incluido en `ADMIN_EMAILS`.
  - si no, `cliente`.

### Vista admin (backoffice separado)

- `/admin` en Next funciona como puente y enlace al backoffice externo.
- El backoffice real corre en `http://localhost:5173` (Vite).
- La data se obtiene del API Bun en `http://localhost:4000`.

---

## 4) Donde modificar cada cosa

- **Catalogo y precios:** `src/lib/catalog.ts`
- **Reglas de rol/admin en storefront:** `src/lib/roles.ts` y `ADMIN_EMAILS`
- **Comportamiento de checkout:** `src/components/checkout-button.tsx` y `bun-api/src/index.ts`
- **Backoffice admin:** `admin-backoffice/src/**`
- **API y base de datos (Bun):** `bun-api/src/**`
- **Stack completo:** `docker-compose.yml`

---

## 5) Rutas clave

- `/` -> Home + catalogo
- `/sign-in` -> Login
- `/sign-up` -> Registro
- `/dashboard` -> Cuenta del usuario
- `/admin` -> Enlace a backoffice externo
- `/api/checkout` -> Proxy Vite hacia API de compra en Bun
- `http://localhost:5173` -> Backoffice admin (Vite)
- `http://localhost:4000/health` -> Salud del API Bun
