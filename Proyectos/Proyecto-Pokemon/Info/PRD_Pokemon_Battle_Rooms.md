# PRD — Pokémon Battle Rooms (1v1)

## 1. Resumen del producto
Aplicación web para batallas Pokémon **1 jugador vs 1 jugador** mediante salas con código.  
La plataforma permite crear/join sala, seleccionar equipos, ejecutar turnos, calcular daño en backend con datos de PokéAPI y terminar la partida cuando un jugador pierde sus 6 Pokémon.

## 2. Contexto y fuentes
Este PRD consolida requisitos de:
1. Documento base del proyecto académico (PDF).
2. Notas funcionales adicionales del TXT del proyecto.

## 3. Objetivo
Entregar una versión funcional, jugable y consistente de combate por turnos, con datos reales importados desde PokéAPI y persistidos en MongoDB, usando stack definido por la materia.

## 4. Alcance (MVP obligatorio)
- Batalla 1v1 por sala con código único.
- Catálogo persistido de al menos **300 Pokémon** desde PokéAPI.
- Cada Pokémon en batalla con **exactamente 4 movimientos válidos** (sin repetidos).
- Equipo por jugador de hasta **6 Pokémon**.
- Acciones por turno: **atacar** o **cambiar Pokémon** (sin ítems ni huida).
- Cálculo de daño, efectividad de tipos y validación de reglas en backend.
- Estados temporales visibles en UI y log.
- UI con sprites consistentes, barras de vida, log y animaciones básicas.

## 5. Fuera de alcance (MVP)
- Login/cuentas persistentes.
- Matchmaking público/ranked completo.
- Economía, inventario, tienda.
- Modo historia/PvE.

## 6. Usuarios y casos de uso
### Usuario A (creador)
- Crea sala.
- Comparte código.
- Espera en lobby.
- Selecciona equipo y juega.

### Usuario B (invitado)
- Ingresa código.
- Se une a lobby.
- Selecciona equipo y juega.

### Caso de éxito principal
Dos jugadores entran a una sala, inician partida, juegan turnos hasta que uno derrota los 6 Pokémon del rival.

## 7. Requisitos funcionales detallados
### 7.1 Datos Pokémon y movimientos
- Importar y guardar en MongoDB:
  - `pokemon`: id, nombre, tipos, stats base, sprite, movimientos disponibles.
  - `move`: nombre, tipo, poder, precisión, prioridad, categoría y efectos relevantes.
  - `type`: relaciones de daño (doble, mitad, cero).
- No hardcodear catálogo ni tabla de tipos.

### 7.2 Salas
- Crear sala con código único.
- Join por código.
- Lobby en espera de segundo jugador.
- Inicio al estar ambos listos.
- Permitido jugar desde 2 computadoras o 2 navegadores/sesiones.

### 7.3 Reglas de combate
- Formato: 1v1, hasta 6 Pokémon por jugador, 1 activo por lado.
- Acciones por turno:
  - Usar 1 de 4 movimientos.
  - Cambiar al activo por otro Pokémon vivo.
- Backend valida:
  - Jugador pertenece a la sala.
  - Acción no duplicada en el mismo turno.
  - Movimiento pertenece al Pokémon activo.
  - Pokémon activo no está debilitado.

### 7.4 Orden de turno
- Regla mínima solicitada en notas: **coin flip inicial** y luego alternancia por turnos sin velocidad.
- Mejora opcional del enunciado: prioridad de movimiento > velocidad efectiva > coin flip por empate.

### 7.5 Daño y tipos
- Daño calculado en backend.
- Factores: poder, stat ataque/defensa, STAB, efectividad, crítico, factor aleatorio.
- Multiplicadores de tipo: x2, x0.5, x0, x1 (combinables para doble tipo).
- Log debe indicar resultado de efectividad.

### 7.6 Estados
- Enunciado base: estados duran **3 turnos**.
- Nota TXT: “efectos de un turno” y se eliminan al retirar Pokémon.
- Regla consolidada propuesta para MVP:
  - Estados mayores (veneno/quemadura/parálisis): 3 turnos.
  - Debuffs temporales de stat (si se implementan): 1 turno.
  - Todo estado/debuff se elimina al cambiar o retirar Pokémon.

### 7.7 Interfaz
- Pantallas:
  - Crear sala.
  - Unirse por código.
  - Lobby.
  - Selección de equipo con tiempo límite.
  - Batalla.
- En batalla mostrar:
  - Pokémon activos de ambos jugadores.
  - Sprites del mismo estilo visual.
  - Tipos, HP, estados.
  - 4 botones de movimientos.
  - Botón de cambio.
  - Log y mensaje de victoria/derrota.
- Animaciones básicas:
  - Ataque, daño recibido, cambio, barra de vida, debilitamiento.

## 8. Requisitos no funcionales
- Stack requerido: **TanStack Start + Hono sobre Bun + MongoDB + Docker Compose**.
- Persistencia local de datos para no depender de PokéAPI en cada turno.
- Tiempo de respuesta de acción de turno razonable para demo en clase.
- UI clara y consistente visualmente.

## 9. Arquitectura y componentes
- **Frontend (TanStack Start)**: vistas, estado de UI, polling/refetch/SSE/WebSocket.
- **Backend (Hono/Bun)**: salas, validación de acciones, motor de turnos, cálculo de daño, log.
- **DB (MongoDB)**: catálogo Pokémon/moves/types, rooms, battles, snapshots de turno.
- **Importador PokéAPI**: script de ingesta y normalización.

## 10. Modelo de datos (alto nivel)
- `Pokemon`: pokedexId, name, types[], baseStats, spriteUrl, moveIds[].
- `Move`: name, type, power, accuracy, priority, damageClass, effect.
- `Room`: code, status, players[], createdAt.
- `Battle`: roomCode, turn, playersState, activePokemon, pendingActions, battleLog, winner.

## 11. API mínima sugerida
- `POST /rooms` crear sala.
- `POST /rooms/:code/join` unirse.
- `POST /rooms/:code/ready` confirmar listo.
- `POST /rooms/:code/start` iniciar.
- `GET /rooms/:code` estado de lobby/sala.
- `POST /battles/:roomCode/action` enviar acción.
- `GET /battles/:roomCode/state` estado actual.
- `GET /battles/:roomCode/log` log.

## 12. Criterios de aceptación (demo)
1. Se levanta por Docker Compose.
2. Se crea sala y se une segundo jugador por código.
3. Se muestran Pokémon con sprites consistentes y 4 movimientos exactos.
4. Se ejecutan turnos con daño y efectividad por tipo correctos.
5. Se evidencia estado temporal y su limpieza al cambio.
6. Se alcanza victoria/derrota al debilitar los 6 Pokémon de un jugador.

## 13. Backlog de opcionales (bonus)
- Fase de ban de Pokémon pre-partida (ranked-like).
- Prioridad + velocidad en orden real de turno.
- Temporizador por turno.
- Replay/historial.
- Reconexión a sala.
- Modo espectador.

## 14. Riesgos y mitigación
- **Ingesta incompleta de datos**: validar mínimo 300 Pokémon y movimientos útiles.
- **Desbalance o bugs de motor**: cubrir reglas núcleo primero (turno, daño, victoria).
- **Inconsistencia visual**: fijar una sola fuente/estilo de sprites.
- **Tiempo de entrega corto**: priorizar MVP y dejar bonus desacoplado.

## 15. Definición de éxito
- Proyecto funcional de punta a punta con flujo completo de sala + batalla.
- Cumplimiento de requisitos obligatorios de la rúbrica base.
- Demo estable en clase.
