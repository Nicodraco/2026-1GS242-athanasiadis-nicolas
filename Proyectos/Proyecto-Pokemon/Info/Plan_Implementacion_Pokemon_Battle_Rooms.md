# Plan de implementación — Pokémon Battle Rooms

## Problema y enfoque
Construir una aplicación 1v1 por salas que cumpla el MVP del PRD: datos reales de PokéAPI persistidos en MongoDB, motor de combate resuelto en backend, y UI funcional con animaciones básicas.  
El enfoque de ejecución es por capas: **datos → dominio de batalla → API/salas → UI → integración/demo**.

## Fases de ejecución

### Fase 0 — Base técnica y estructura
1. Confirmar estructura del proyecto con TanStack Start + Hono/Bun + MongoDB + Docker.
2. Definir módulos:
   - `importer` (PokéAPI → MongoDB)
   - `battle-engine` (reglas y resolución)
   - `rooms-service`
   - `battle-service`
3. Configurar `.env` y `docker-compose.yml` para app + base de datos.

### Fase 1 — Ingesta y normalización de datos
1. Implementar script de importación desde PokéAPI para mínimo 300 Pokémon.
2. Persistir colecciones `pokemon`, `moves`, `types`.
3. Aplicar reglas de movimientos:
   - exactamente 4 movimientos por Pokémon en batalla
   - sin movimientos repetidos
   - excluir/documentar Pokémon sin 4 movimientos válidos.
4. Documentar comando de importación en README.

### Fase 2 — Modelo de dominio y estado de partida
1. Definir modelos `Room` y `Battle` en MongoDB.
2. Diseñar estado de batalla serializable con:
   - equipos por jugador (hasta 6)
   - Pokémon activo por lado
   - HP, estados, turnos restantes, log
   - acciones pendientes por turno.
3. Implementar utilidades de dominio:
   - cálculo de stats
   - multiplicadores por tipo
   - aplicación y limpieza de estados.

### Fase 3 — Motor de combate (backend)
1. Validar acciones:
   - jugador pertenece a sala
   - no doble acción por turno
   - movimiento válido del activo
   - activo vivo.
2. Resolver orden de acciones (MVP: coin flip inicial + turnos).
3. Implementar cálculo de daño con STAB, efectividad, crítico y random factor.
4. Implementar estados temporales:
   - estados mayores: 3 turnos
   - limpieza al cambiar/retirar.
5. Determinar victoria/derrota y registrar eventos en log.

### Fase 4 — API HTTP de salas y batalla
1. Exponer endpoints mínimos:
   - crear/join/ready/start sala
   - enviar acción
   - consultar estado y log.
2. Definir manejo consistente de errores y validaciones.
3. Implementar actualización de cliente (polling o SSE).

### Fase 5 — Frontend y experiencia de juego
1. Construir vistas:
   - crear sala
   - unirse por código
   - lobby
   - selección de equipo con tiempo límite
   - batalla.
2. En batalla mostrar:
   - sprites consistentes
   - HP/tipos/estados
   - 4 movimientos
   - cambio de Pokémon
   - log y resultado final.
3. Añadir animaciones básicas de ataque, daño, cambio y barra de vida.

### Fase 6 — Integración y demo
1. Probar flujo completo con 2 jugadores (2 sesiones).
2. Validar criterios del PRD para demo.
3. Completar README (setup, reglas, importación, limitaciones).
4. Ejecutar demo completa sobre Docker Compose.

## Backlog opcional (después del MVP)
1. Fase de ban prepartida.
2. Orden por prioridad + velocidad.
3. Temporizador por turno.
4. Replay/historial.
5. Reconexión a sala y modo espectador.

## Notas clave
- Mantener el motor de batalla desacoplado del transporte HTTP.
- No hardcodear efectividades de tipo.
- Guardar snapshots por turno para trazabilidad del log.
