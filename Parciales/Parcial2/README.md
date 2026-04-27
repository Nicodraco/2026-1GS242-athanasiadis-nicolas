# Parcial #2 - Ecommerce B2C (UrbanSprout)

Arquitectura dividida para ecommerce B2C de kits de cultivo urbano:

1. **Storefront** en **React + Vite** (`/` y `/dashboard` cliente).
2. **Backoffice admin** en **React + Vite** (`admin-backoffice/`, fuera de Next).
3. **Data/API service** en **Bun** con persistencia SQLite (`bun-api/`).
4. **Orquestación** con **Docker Compose**.

## Incluye

1. **Landing page** con CTA principal: `Empezar a cultivar hoy`.
2. **Autenticación con Clerk** (Google, Microsoft y OTP vía configuración de Clerk).
3. **Checkout con Stripe** vía API Bun (`POST /api/checkout`).
4. **Backoffice desacoplado** para operación administrativa.
5. **Tipos de usuario**:
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

Para backoffice local:

```bash
npm --prefix admin-backoffice install
npm run dev:admin
```

Para API Bun:

```bash
bun --cwd bun-api install
npm run dev:api
```

### Stack completo con Docker Compose

```bash
npm run docker:up
```

## Rutas principales

- `/` Landing + catálogo.
- `/sign-in` Login Clerk.
- `/sign-up` Registro Clerk.
- `/dashboard` Panel del cliente.
- `/admin` Página puente hacia backoffice externo.
- `/api/checkout` Proxy frontend hacia API Bun para crear sesión de Stripe.

Rutas del backoffice (Vite):

- `http://localhost:5173` Panel admin operativo.

Rutas API Bun:

- `GET /health`
- `GET /orders`
- `PATCH /orders/:id`
- `GET /inventory`
- `PATCH /inventory/:sku`
- `POST /webhooks/stripe`
