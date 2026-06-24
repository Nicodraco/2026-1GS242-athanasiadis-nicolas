import json
import os
import re

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("qaLabMcp")

_tool_usage = {}

def _track(func):
    name = func.__name__
    _tool_usage[name] = 0
    def wrapper(*args, **kwargs):
        _tool_usage[name] += 1
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    wrapper.__doc__ = func.__doc__
    wrapper.__wrapped__ = func
    return wrapper


@mcp.tool()
@_track
def validar_cliente(cip: str, telefono: str, email: str) -> dict:
    """Valida y normaliza los datos de un cliente."""
    cip = cip.strip().upper()
    if not cip:
        return {"error": "CIP no puede estar vacio"}

    digitos = re.sub(r"\D", "", telefono)
    if len(digitos) != 8:
        return {"error": "El telefono debe tener 8 digitos"}
    telefono_normalizado = f"{digitos[:4]}-{digitos[4:]}"

    email = email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        return {"error": "Email invalido"}

    return {
        "cip": cip,
        "telefono": telefono_normalizado,
        "email": email,
        "valido": True,
    }


@mcp.tool()
@_track
def generar_caso_prueba(endpoint: str, metodo: str, escenario: str) -> dict:
    """Genera un caso de prueba funcional a partir de endpoint, metodo y escenario."""
    metodo = metodo.upper()
    import hashlib, time

    case_id = hashlib.md5(
        f"{endpoint}{metodo}{escenario}{time.time()}".encode()
    ).hexdigest()[:8]

    return {
        "id": f"TC-{case_id}",
        "endpoint": endpoint,
        "metodo": metodo,
        "escenario": escenario,
        "pasos": [
            f"Configurar solicitud {metodo} a {endpoint}",
            "Enviar la solicitud con los datos del escenario",
            "Validar el codigo de estado de la respuesta",
            "Validar el cuerpo de la respuesta",
        ],
        "resultado_esperado": f"Respuesta exitosa para {escenario} en {metodo} {endpoint}",
    }


@mcp.tool()
@_track
def calcular_percentil_simple(valores: list, percentil: float) -> dict:
    """Calcula un percentil simple sobre una lista de valores."""
    if not valores:
        return {"error": "La lista de valores no puede estar vacia"}
    if not (0 <= percentil <= 100):
        return {"error": "El percentil debe estar entre 0 y 100"}

    ordenados = sorted(valores)
    n = len(ordenados)
    k = (percentil / 100.0) * (n - 1)
    f = int(k)
    c = k - f

    if f + 1 < n:
        valor = ordenados[f] + c * (ordenados[f + 1] - ordenados[f])
    else:
        valor = ordenados[f]

    return {
        "valores": ordenados,
        "percentil": percentil,
        "resultado": round(valor, 2),
    }


@mcp.tool()
@_track
def clasificar_error_http(status_code: int) -> str:
    """Clasifica un codigo de estado HTTP en Exito, Redireccion, Error del cliente o Error del servidor."""
    if 200 <= status_code <= 299:
        return "Exito"
    if 300 <= status_code <= 399:
        return "Redireccion"
    if 400 <= status_code <= 499:
        return "Error del cliente"
    if 500 <= status_code <= 599:
        return "Error del servidor"
    return "Codigo desconocido"


@mcp.tool()
@_track
def evaluar_sla(p95_ms: float, limite_ms: float) -> dict:
    """Evalua si un P95 cumple con el limite de SLA."""
    cumple = p95_ms <= limite_ms
    diferencia = round(limite_ms - p95_ms, 2)
    return {
        "cumple": cumple,
        "p95_ms": p95_ms,
        "limite_ms": limite_ms,
        "diferencia_ms": diferencia,
    }


@mcp.tool()
@_track
def validar_respuesta_api(
    status_code: int, tiempo_ms: float, limite_ms: float, tiene_token: bool
) -> dict:
    """Valida una respuesta de API: 2xx, tiempo <= limite y token presente."""
    errores = []
    if not (200 <= status_code <= 299):
        errores.append(f"Status code {status_code} no es 2xx")
    if tiempo_ms > limite_ms:
        errores.append(f"Tiempo {tiempo_ms}ms excede el limite {limite_ms}ms")
    if not tiene_token:
        errores.append("No tiene token de autenticacion")

    valido = len(errores) == 0
    return {
        "valido": valido,
        "razon": "Respuesta valida" if valido else "; ".join(errores),
    }


@mcp.tool()
@_track
def buscar_cliente(cip: str) -> dict:
    """Busca un cliente por CIP en datos_prueba.json."""
    ruta = os.path.join(os.path.dirname(__file__), "datos_prueba.json")
    if not os.path.exists(ruta):
        return {"error": f"Archivo datos_prueba.json no encontrado en {ruta}"}

    with open(ruta, "r", encoding="utf-8") as f:
        datos = json.load(f)

    for cliente in datos:
        if cliente["cip"] == cip:
            return {"encontrado": True, "cliente": cliente}

    return {"encontrado": False, "mensaje": f"Cliente con CIP {cip} no encontrado"}


@mcp.tool()
@_track
def validar_token_jwt(token: str) -> dict:
    """Decodifica y valida un token JWT sin necesidad de clave secreta."""
    import time
    import base64
    import json

    partes = token.split(".")
    if len(partes) != 3:
        return {"valido": False, "error": "El JWT debe tener 3 partes separadas por punto"}

    try:
        def b64decode(s):
            s = s + "=" * (4 - len(s) % 4)
            return json.loads(base64.urlsafe_b64decode(s).decode("utf-8"))

        header = b64decode(partes[0])
        payload = b64decode(partes[1])
        firma = partes[2]

        ahora = time.time()
        exp = payload.get("exp")
        nbf = payload.get("nbf")
        warnings = []

        if exp and ahora > exp:
            warnings.append(f"Token EXPIRADO desde {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(exp))}")
        if exp:
            restante = exp - ahora
            if restante > 0:
                warnings.append(f"Expira en {restante:.0f}s ({time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(exp))})")
        if nbf and ahora < nbf:
            warnings.append("Token NO valido aun (nbf en el futuro)")

        return {
            "valido": len([w for w in warnings if "EXPIRADO" in w or "NO valido" in w]) == 0,
            "header": header,
            "payload": payload,
            "firma": firma[:20] + "..." if len(firma) > 20 else firma,
            "warnings": warnings,
        }
    except Exception:
        return {"valido": False, "error": "El token no tiene un formato JWT valido"}


@mcp.tool()
@_track
def reporte_cobertura() -> dict:
    """Genera un reporte de uso de tools (cobertura)."""
    todas = {k: v for k, v in _tool_usage.items()}
    usadas = [k for k, v in todas.items() if v > 0]
    no_usadas = [k for k, v in todas.items() if v == 0]
    total = len(todas)
    usadas_count = len(usadas)
    cobertura = round((usadas_count / total) * 100, 1) if total > 0 else 0
    return {
        "total_tools": total,
        "tools_usadas": usadas_count,
        "cobertura_porcentaje": cobertura,
        "detalle": todas,
        "no_usadas": no_usadas,
    }


if __name__ == "__main__":
    import sys
    transport = sys.argv[1] if len(sys.argv) > 1 else "stdio"
    if transport == "sse":
        print("Iniciando servidor MCP en modo SSE en http://localhost:8000 ...")
    mcp.run(transport=transport)
