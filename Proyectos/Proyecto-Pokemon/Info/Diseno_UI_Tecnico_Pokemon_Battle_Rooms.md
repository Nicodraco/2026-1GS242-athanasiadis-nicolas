# Diseño UI + Técnico — Pokémon Battle Rooms (MVP)

## 1. Dirección de diseño (UI)

### Concepto visual
**Arena táctica neón**: interfaz oscura, contraste alto, lectura clara para demo en vivo y jerarquía visual fuerte en batalla.

### Identidad visual
- **Base**: `#0B1020`
- **Superficies**: `#121A2E`, `#18233D`
- **Texto principal**: `#EAF0FF`
- **Texto secundario**: `#A9B7D9`
- **Acento primario**: `#5EE1FF`
- **Acento de alerta**: `#FF6B8A`
- **Éxito**: `#6DFF9A`

### Tipografía
- **Display (títulos)**: una fuente con personalidad y peso visual.
- **UI/Data (contenido)**: sans altamente legible para stats, logs y botones.

### Motion y microinteracciones
- Duraciones cortas: **150–250ms**.
- Easing suave para paneles y barras de vida.
- Impactos de ataque y daño con shake/flash breve.
- Sin animaciones largas que frenen el turno.

---

## 2. Arquitectura de pantallas (flujo UX)

1. **Home**  
   Crear sala o unirse por código.

2. **Lobby**  
   Estado de jugadores, listo/no listo, inicio cuando ambos estén ready.

3. **Selección de equipo**  
   Hasta 6 Pokémon, validación de selección y timer visible.

4. **Batalla**  
   Campo principal, acciones por turno, log, estado en tiempo real.

5. **Resultado**  
   Victoria/derrota + acciones de salida/reinicio de flujo.

---

## 3. Layout de batalla (pantalla clave)

### Zonas
- **Centro**: campo con ambos Pokémon activos y animaciones.
- **Lateral derecho**: log de eventos (scrollable).
- **Inferior**: barra de acciones (4 movimientos + cambio).

### Información siempre visible
- HP actual y máximo (barra + valor).
- Tipos del Pokémon activo.
- Estados temporales (badge con contador de turnos).
- Turno actual y jugador en espera/acción.

---

## 4. Sistema de componentes

- `RoomCard`
- `PlayerSlot`
- `PokemonPicker`
- `BattleField`
- `HealthBar`
- `StatusBadge`
- `MoveButton`
- `SwitchDrawer`
- `BattleLog`
- `TurnBanner`
- `ResultModal`

### Reglas de componentes
- `MoveButton` se deshabilita si acción inválida o turno no disponible.
- `SwitchDrawer` solo muestra Pokémon vivos.
- `BattleLog` prioriza eventos críticos (KO, efectividad, estado aplicado).

---

## 5. Diseño técnico frontend

### Estructura por features
- `features/rooms`
- `features/team-builder`
- `features/battle`
- `shared/ui`
- `shared/api`

### Stores/estado
- `roomStore`: sala, código, jugadores, ready state.
- `teamStore`: selección de equipo y validaciones.
- `battleStore`: snapshot del turno, acciones, resultado.
- `uiStore`: modales, notificaciones, estado visual local.

### Principios de estado
- El backend es la **fuente de verdad**.
- El cliente usa estado optimista solo para feedback rápido.
- Cada turno se representa como `turnSnapshot` serializable.

---

## 6. Contrato con backend (MVP)

### Endpoints
- `POST /rooms`
- `POST /rooms/:code/join`
- `POST /rooms/:code/ready`
- `POST /rooms/:code/start`
- `GET /rooms/:code`
- `POST /battles/:roomCode/action`
- `GET /battles/:roomCode/state`
- `GET /battles/:roomCode/log`

### Sincronización cliente
- Preferible: **SSE**.
- Alternativa MVP: **polling** con intervalo corto.

### Errores normalizados
- `ROOM_NOT_FOUND`
- `ROOM_FULL`
- `PLAYER_NOT_IN_ROOM`
- `INVALID_ACTION`
- `ACTION_ALREADY_SUBMITTED`
- `POKEMON_FAINTED`

---

## 7. Reglas UX críticas alineadas al PRD

- No permitir doble acción en el mismo turno.
- No permitir movimiento que no pertenezca al activo.
- Mostrar efectividad (`x2`, `x0.5`, `x0`) de forma explícita.
- Limpiar visualmente estados al cambiar/retirar Pokémon.
- Cierre claro de partida con victoria/derrota al perder 6 Pokémon.

---

## 8. Criterios de calidad visual para demo

- Coherencia total de sprites (mismo estilo/fuente).
- Contraste AA mínimo en textos informativos.
- Botones de acción con estados `default/hover/disabled`.
- Log legible y estable durante toda la partida.
- Feedback inmediato de acciones y daño sin ambigüedad.

