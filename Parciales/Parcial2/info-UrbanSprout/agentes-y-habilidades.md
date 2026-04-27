# UrbanSprout - Agentes y habilidades recomendadas

Documento operativo para ejecutar el PRD y el plan del proyecto con máxima eficiencia.

## 1) Mapa de agentes por fase del plan

| Fase | Objetivo | Agente principal | Agente de apoyo |
|---|---|---|---|
| Fase A - Estabilización MVP | Robustecer auth/checkout/roles | `general-purpose` | `task` |
| Fase B - Webhooks y órdenes | Registrar compras automáticas | `general-purpose` | `code-review` |
| Fase C - Backoffice mínimo | Operar pedidos e inventario | `general-purpose` | `explore` |
| Fase D - Optimización comercial | Subir conversión y ticket | `general-purpose` | `frontend-design` |
| Fase E - Retención | Recompra por suscripción | `general-purpose` | `code-review` |

## 2) Habilidades (skills) recomendadas

## frontend-design

- Aplicar en:
  - Rediseño incremental de landing y catálogo.
  - Dashboard de cliente con historial de órdenes.
  - Backoffice admin (tablas, filtros, estados).
  - Flujo de carrito/cupones/suscripción.
- Beneficio esperado:
  - Mejor jerarquía visual, claridad de estados y conversión.

## customize-cloud-agent

- Aplicar en:
  - Estandarizar setup remoto para lint/build/test/e2e.
  - Reducir fricción al correr tareas de CI o agentes cloud.
- Beneficio esperado:
  - Ejecución consistente y menos errores por entorno.

## 3) Playbook de uso recomendado

1. Implementación de feature:
   - `general-purpose` para construir.
   - `task` para correr `lint/build/test:e2e`.
   - `code-review` para detectar fallos críticos antes de merge.

2. Investigación transversal:
   - `explore` cuando impacta múltiples módulos (`src/app`, `src/lib`, `src/proxy.ts`).

3. Cambios visuales o UX:
   - activar `frontend-design` desde el inicio del trabajo.

## 4) Definición de “mejor combinación” para UrbanSprout

- **Base fija:** `general-purpose` + `task` + `code-review`.
- **Cuando hay foco UI:** sumar `frontend-design`.
- **Cuando hay foco de entorno/automation:** sumar `customize-cloud-agent`.
- **Cuando hay investigación amplia:** sumar `explore`.

