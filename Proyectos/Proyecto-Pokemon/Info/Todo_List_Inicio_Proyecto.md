# Todo List de Inicio — Pokémon Battle Rooms

## 1. Setup base del proyecto
- Estructura módulos: `importer`, `battle-engine`, `rooms-service`, `battle-service`, `frontend`.
- Configurar `.env` y `docker-compose` (app + MongoDB).
- Levantar proyecto local end-to-end.

## 2. Ingesta y normalización PokéAPI
- Importar mínimo 300 Pokémon.
- Persistir colecciones `pokemon`, `moves`, `types`.
- Garantizar 4 movimientos válidos únicos por Pokémon en batalla.
- Documentar comando de importación en README.

## 3. Modelos de dominio y base de datos
- Definir esquemas `Room` y `Battle`.
- Definir estado serializable por turno (`turnSnapshot`, `pendingActions`, `battleLog`, `winner`).
- Implementar utilidades de stats, tipos y estados.

## 4. Motor de combate (backend)
- Validar acciones: jugador en sala, no doble acción, movimiento válido, activo vivo.
- Implementar orden de turno MVP: coin flip inicial + alternancia.
- Implementar cálculo de daño: STAB, efectividad, crítico y random factor.
- Implementar estados temporales y limpieza al cambio.
- Resolver condición de victoria al debilitar 6 Pokémon del rival.

## 5. API HTTP (salas + batalla)
- Endpoints de salas: crear, join, ready, start, consultar estado.
- Endpoints de batalla: enviar acción, estado actual, log.
- Estandarizar errores (`ROOM_NOT_FOUND`, `INVALID_ACTION`, etc.).

## 6. Frontend base (según diseño UI+técnico)
- Construir pantallas: Home, Lobby, Selección de equipo, Batalla, Resultado.
- Implementar componentes clave: `BattleField`, `MoveButton`, `HealthBar`, `BattleLog`, etc.
- Integrar stores: `roomStore`, `teamStore`, `battleStore`, `uiStore`.
- Conectar cliente con backend usando polling o SSE.

## 7. UX de batalla y animaciones
- Animaciones básicas: ataque, daño, cambio, barra de vida, debilitamiento.
- Bloqueos UX: sin doble acción y sin movimientos inválidos.
- Log claro de efectividad, estados y eventos críticos.

## 8. Integración final y demo
- Probar flujo completo con 2 jugadores (2 sesiones/navegadores).
- Ajustar estabilidad y consistencia visual.
- Completar README: setup, reglas, importación y limitaciones.
- Ejecutar demo final sobre Docker Compose.

