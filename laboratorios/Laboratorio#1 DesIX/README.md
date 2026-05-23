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

Se agregó una suite E2E con Playwright (7 tests, 28+ assertions) para validar flujos críticos de punta a punta sobre la aplicación de encuestas.

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
4. **Login profesor (E2E):** inicio de sesión con credenciales existentes vía API seed + UI.
5. **Login estudiante (E2E):** inicio de sesión y voto completo con credenciales existentes.
6. **Resultados en vivo (E2E):** profesor visualiza resultados de su encuesta.
7. **Cierre de encuesta (E2E):** profesor cierra encuesta y se refleja estado "Cerrada".

### 8.4 Estructura de pruebas y locators estables

- Se usa carpeta dedicada `frontend/e2e/`.
- Se usan `data-testid` en elementos clave para reducir fragilidad en selectors.
- Datos de prueba son únicos por ejecución (emails dinámicos), para evitar colisiones.

### 8.5 Qué valida cada assertion

- No solo navegación; también estado real de negocio:
  - creación de encuesta reflejada en panel de resultados y código válido.
  - voto de estudiante reflejado en estado “Ya votaste” y conteo de resultados.
  - control de acceso por rol en ruta protegida.
  - login con credenciales existentes redirige correctamente según rol.
  - resultados en vivo muestran código de encuesta y total de votos.
  - cierre de encuesta deshabilita botón y muestra estado "Cerrada".

## 9. Bitácora agéntica

### 9.1 Uso de Claude Code (agente principal)

Usé **Claude Code** como agente principal para la creación de la suite E2E. Le pedí:
- Integrar Playwright en el proyecto frontend con configuración de servidor dual (backend + frontend preview).
- Escribir la primera batería de tests cubriendo: flujo profesor (registro + creación de encuesta), flujo estudiante (registro + voto) y caso negativo de acceso.
- Agregar `data-testid` en los componentes clave del frontend para evitar fragilidad en los selectores.

Claude Code generó la configuración de Playwright (`playwright.config.js`), los scripts npm (`test:e2e`, `test:e2e:headed`, `test:e2e:ui`) y los 3 tests iniciales. También documentó la ejecución y los flujos validados en este README. El agente propuso usar emails dinámicos vía `uniqueEmail()` para evitar colisiones entre ejecuciones, lo cual acepté sin cambios.

### 9.2 Expansión con Claude Code (ampliación de cobertura)

En una segunda iteración, Claude Code agregó 4 tests más para cubrir los flujos que la rúbrica pedía pero la suite inicial no alcanzaba:
- Login profesor con credenciales existentes (vía API seed + UI login)
- Login estudiante con credenciales existentes
- Visualización de resultados en vivo por parte del profesor
- Cierre de encuesta y verificación de estado "Cerrada"

### 9.3 Lo que corregí / validé manualmente

Revisé que las aserciones representen comportamiento real de negocio y no solo navegación. También validé que los nuevos tests no duplicaran setup innecesariamente y que los locators apuntaran a `data-testid` existentes. Ejecuté la suite completa en modo headless y headed para confirmar que pasa.

### 9.4 Resultado final

La suite pasó de 3 tests (12 expects) a 7 tests (28+ expects), cubriendo login, registro, voto, resultados en vivo y control de acceso por rol.
