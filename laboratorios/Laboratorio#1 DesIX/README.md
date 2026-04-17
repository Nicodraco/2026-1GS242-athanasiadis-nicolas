# PollClass - Sistema de Encuestas en Vivo

Aplicación full stack con dos vistas:
- **Profesor:** crea encuestas, comparte enlace por código, ve resultados en tiempo real, cierra y elimina encuestas.
- **Votador:** entra por enlace/código, vota una sola vez y visualiza resultados.

Stack: **React (Vite) + Bun.js + MongoDB + CSS custom (Glassmorphism) + Recharts**.  
Actualización en vivo por **polling** (`setInterval`), sin WebSockets.

## 1. Requisitos

- Bun `1.3+`
- MongoDB local o remoto

## 2. Configuración

### Backend

```bash
cd backend
Copy-Item .env.example .env
```

Editar `.env`:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/pollclass
FRONTEND_URL=http://localhost:4173
JWT_SECRET=super-secret-jwt-key
JWT_EXPIRES_IN=1d
```

### Frontend

```bash
cd frontend
Copy-Item .env.example .env
```

Editar `.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

## 3. Ejecución local

En dos terminales:

```bash
cd backend
bun install
bun run dev
```

```bash
cd frontend
npm install
npm run build
npm run preview -- --host=127.0.0.1 --port=4173
```

Frontend: `http://localhost:4173`  
Backend health: `http://localhost:4000/api/health`

> Nota: si la carpeta del proyecto contiene `#` (ej. `Laboratorio#1 ...`), Vite puede fallar en modo `dev`. Usa `preview` en `4173` o renombra la carpeta.

### Si la página no carga

En esta entrega **no se incluye `node_modules`** para mantener bajo el peso del repositorio.  
Por eso, antes de ejecutar, el profesor debe correr:

```bash
cd backend && bun install
cd frontend && npm install
```

Checklist rápido:
- Verificar que MongoDB esté encendido.
- Verificar `backend/.env` con `FRONTEND_URL=http://localhost:4173`.
- Verificar `frontend/.env` con `VITE_API_URL=http://localhost:4000/api`.
- Levantar backend y frontend con los comandos de la sección 3.

## 4. Flujo de uso

1. Ir a `/auth` y registrarse como **Profesor** o **Estudiante**.
2. Profesor entra a `/teacher`, crea encuesta (2 a 4 opciones) y comparte enlace `/poll/:code`.
3. Estudiante inicia sesión y vota en el enlace de encuesta.
4. Profesor y estudiantes ven resultados actualizados por polling (`setInterval`).

## 5. Despliegue rápido con ngrok

Con backend y frontend corriendo localmente:

```bash
ngrok http 4173
```

Usar la URL pública de ngrok para compartir el frontend.  
Si necesitas exponer también el backend por separado:

```bash
ngrok http 4000
```

## 6. Entrega de laboratorio

Incluye en el repositorio:
- Código completo
- Este `README.md`
- Mínimo 3 capturas: landing, vista profesor, vista estudiante
- Captura del historial de OpenCode/Copilot mostrando proceso agéntico

Guardar capturas en `capturas/` con estos nombres:
- `01-landing.png`
- `02-vista-profesor.png`
- `03-vista-estudiante.png`
- `04-copilot-proceso-agentico.png`

## 7. Smoke test rápido

Con backend y frontend corriendo:

```powershell
.\smoke-test.ps1
```

El script valida:
- Health del backend
- Respuesta del frontend
- Registro/login con JWT
- Creación de encuesta
- Registro de voto

## 8. Validación E2E con Playwright (base lab 5)

Se agregó una suite inicial E2E con Playwright para validar flujos críticos de punta a punta sobre la aplicación de encuestas.

### 8.1 Instalación

```bash
cd frontend
npm install
npx playwright install chromium
```

### 8.2 Ejecución

```bash
cd frontend
npm run test:e2e
```

Scripts disponibles:
- `npm run test:e2e` -> corre toda la suite en headless.
- `npm run test:e2e:headed` -> corre en modo visible.
- `npm run test:e2e:ui` -> abre la UI de Playwright.

La configuración (`frontend/playwright.config.js`) levanta automáticamente:
- Backend Bun en `http://localhost:4000`
- Frontend Vite preview en `http://localhost:4173`

### 8.3 Flujos críticos automatizados

Archivo: `frontend/e2e/pollclass.e2e.spec.js`

1. **Flujo profesor (E2E):** registro como profesor y creación de encuesta.
2. **Flujo estudiante (E2E):** entrar por código, votar y validar estado final de “Ya votaste”.
3. **Caso negativo (E2E):** estudiante intentando acceder a `/teacher` y redirección obligatoria a `/auth`.

### 8.4 Estructura de pruebas y locators estables

- Se usa carpeta dedicada `frontend/e2e/`.
- Se usan `data-testid` en elementos clave para reducir fragilidad en selectors.
- Datos de prueba son únicos por ejecución (emails dinámicos), para evitar colisiones.

### 8.5 Qué valida cada assertion

- No solo navegación; también estado real de negocio:
  - creación de encuesta reflejada en panel de resultados y código válido.
  - voto de estudiante reflejado en estado “Ya votaste” y conteo de resultados.
  - control de acceso por rol en ruta protegida.

## 9. Bitácora agéntica (corta)

- **Qué pedí al agente:** integrar Playwright al proyecto y crear pruebas E2E de flujos críticos con un caso negativo.
- **Qué acepté del agente:** configuración Playwright, scripts npm E2E, tests para profesor/estudiante/acceso prohibido y documentación de ejecución.
- **Qué corregí yo:** revisión de criterios de la asignación y verificación de que los flujos correspondan al laboratorio.
- **Cómo validé:** ejecución de comandos de build y de suite E2E, revisando que las assertions representen comportamiento funcional real.
