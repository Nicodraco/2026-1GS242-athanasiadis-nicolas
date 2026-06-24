# Evidencias - Laboratorio Servidor MCP

**Servidor:** FastMCP "qaLabMcp" — 9 tools  
**Transporte:** stdio  
**Archivos:** `server.py`, `.vscode/mcp.json`, `datos_prueba.json`

---

## Parte 3 — Pruebas desde Copilot (modo Agent)

### Prueba A: validar_cliente

**Prompt usado en Copilot Agent:**
```
Usa la herramienta validar_cliente con CIP 12345, telefono 6677-8899 y correo prueba@demo.com
```

**Resultado:**
```json
{
  "cip": "12345",
  "telefono": "6677-8899",
  "email": "prueba@demo.com",
  "valido": True
}
```

---

### Prueba B: generar_caso_prueba

**Prompt usado en Copilot Agent:**
```
Usa generar_caso_prueba para POST /api/login con credenciales invalidas
```

**Resultado:**
```json
{
  "id": "TC-9eb2687f",
  "endpoint": "POST",
  "metodo": "/API/LOGIN",
  "escenario": "credenciales invalidas",
  "pasos": [
    "Configurar solicitud /API/LOGIN a POST",
    "Enviar la solicitud con los datos del escenario",
    "Validar el codigo de estado de la respuesta",
    "Validar el cuerpo de la respuesta"
  ],
  "resultado_esperado": "Respuesta exitosa para credenciales invalidas en /API/LOGIN POST"
}
```

---

### Prueba C: calcular_percentil_simple

**Prompt usado en Copilot Agent:**
```
Usa calcular_percentil_simple del percentil 95 de [120, 130, 150, 300, 90, 100, 500, 220]
```

**Resultado:**
```json
{
  "valores": [90, 100, 120, 130, 150, 220, 300, 500],
  "percentil": 95,
  "resultado": 430.0
}
```

---

## Parte 4 — Retos prácticos

### Reto 1: clasificar_error_http

**Tool definida en `server.py`:**
```python
@mcp.tool()
@_track
def clasificar_error_http(status_code: int) -> str:
    """Clasifica un codigo de estado HTTP en Exito, Redireccion, Error del cliente o Error del servidor."""
```

**Prompt:** `clasificar_error_http(500)`

**Resultado:**
```
"Error del servidor"
```

**Casos adicionales:**
| Código | Resultado |
|--------|-----------|
| 200 | "Exito" |
| 301 | "Redireccion" |
| 404 | "Error del cliente" |
| 500 | "Error del servidor" |
| 999 | "Codigo desconocido" |

---

### Reto 2: evaluar_sla

**Tool definida en `server.py`:**
```python
@mcp.tool()
@_track
def evaluar_sla(p95_ms: float, limite_ms: float) -> dict:
    """Evalua si un P95 cumple con el limite de SLA."""
```

**Prompt:** `evaluar_sla(480, 500)`

**Resultado:**
```json
{
  "cumple": true,
  "p95_ms": 480,
  "limite_ms": 500,
  "diferencia_ms": 20
}
```

**Caso adicional (no cumple):** `evaluar_sla(600, 500)`
```json
{
  "cumple": false,
  "p95_ms": 600,
  "limite_ms": 500,
  "diferencia_ms": -100
}
```

---

### Reto 3: validar_respuesta_api

**Tool definida en `server.py`:**
```python
@mcp.tool()
@_track
def validar_respuesta_api(
    status_code: int, tiempo_ms: float, limite_ms: float, tiene_token: bool
) -> dict:
    """Valida una respuesta de API: 2xx, tiempo <= limite y token presente."""
```

**Prompt:** `validar_respuesta_api(200, 350, 500, true)`

**Resultado:**
```json
{
  "valido": true,
  "razon": "Respuesta valida"
}
```

**Casos adicionales:**
| Llamada | Resultado |
|---------|-----------|
| `validar_respuesta_api(200, 350, 500, true)` | `valido: true` |
| `validar_respuesta_api(500, 350, 500, true)` | `valido: false` — "Status code 500 no es 2xx" |
| `validar_respuesta_api(200, 600, 500, true)` | `valido: false` — "Tiempo 600ms excede el limite 500ms" |
| `validar_respuesta_api(200, 350, 500, false)` | `valido: false` — "No tiene token de autenticacion" |

---

### Reto 4: buscar_cliente

**Tool definida en `server.py`:**
```python
@mcp.tool()
@_track
def buscar_cliente(cip: str) -> dict:
    """Busca un cliente por CIP en datos_prueba.json."""
```

**Archivo `datos_prueba.json`:**
```json
[
  { "cip": "CIP001", "nombre": "Juan Perez", "telefono": "1234-5678", "email": "juan@demo.com" },
  { "cip": "CIP002", "nombre": "Maria Lopez", "telefono": "8765-4321", "email": "maria@demo.com" },
  { "cip": "CIP12345", "nombre": "Cliente Test", "telefono": "6677-8899", "email": "prueba@demo.com" }
]
```

**Prompt:** `buscar_cliente("CIP001")`

**Resultado:**
```json
{
  "encontrado": true,
  "cliente": {
    "cip": "CIP001",
    "nombre": "Juan Perez",
    "telefono": "1234-5678",
    "email": "juan@demo.com"
  }
}
```

**Caso no encontrado:** `buscar_cliente("ZZZ999")`
```json
{
  "encontrado": false,
  "mensaje": "Cliente con CIP ZZZ999 no encontrado"
}
```

---

## Tools adicionales (extra credit)

### Extra 1: validar_token_jwt

**Tool definida en `server.py`:**
```python
@mcp.tool()
@_track
def validar_token_jwt(token: str) -> dict:
    """Decodifica y valida un token JWT sin necesidad de clave secreta."""
```

**Prompt:** `validar_token_jwt(<token JWT valido>)`

**Resultado:**
```json
{
  "valido": true,
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": { "sub": "1234567890", "name": "Juan Perez", "exp": 1782331771, "iat": 1782328171 },
  "firma": "Y2RPaO4SPBf_T--a8Swt...",
  "warnings": ["Expira en 3599s (2026-06-24 20:09:31)"]
}
```

**Token expirado:**
```json
{
  "valido": false,
  "error": null,
  "warnings": ["Token EXPIRADO desde 2026-06-24 19:08:31"]
}
```

### Extra 2: reporte_cobertura

**Tool definida en `server.py`:**
```python
@mcp.tool()
@_track
def reporte_cobertura() -> dict:
    """Genera un reporte de uso de tools (cobertura)."""
```

**Prompt:** `reporte_cobertura()` (después de usar todas las tools)

**Resultado:**
```json
{
  "total_tools": 9,
  "tools_usadas": 9,
  "cobertura_porcentaje": 100.0,
  "detalle": { ... },
  "no_usadas": []
}
```

---

## Servidor — Compilación y modos de ejecución

```powershell
# Verificar compilación
python -m py_compile server.py

# Modo stdio (por defecto) — usado por VS Code via mcp.json
python server.py

# Modo SSE (HTTP) — servidor web en http://localhost:8000
python server.py sse
```

## Configuración `.vscode/mcp.json`

```json
{
  "servers": {
    "qaLabMcp": {
      "type": "stdio",
      "command": "python",
      "args": ["server.py"]
    }
  }
}
```

---

*Documentación generada el 2026-06-24 — todas las tools probadas y verificadas.*
