const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001'

type ApiErrorBody = {
  error?: {
    code: string
    message: string
  }
}

export class ApiError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export type RoomPlayer = {
  playerId: string
  displayName: string
  isReady: boolean
  joinedAt: string
}

export type RoomState = {
  code: string
  status: 'waiting' | 'team_selection' | 'in_battle' | 'finished'
  players: RoomPlayer[]
  teamSelections?: Record<string, number[]>
  battleId: string | null
  createdAt?: string
  updatedAt?: string
  settings: {
    maxPlayers: number
    maxTeamSize: number
  }
}

export type BattlePokemon = {
  pokemonId: number
  name: string
  level: number
  types: string[]
  spriteFrontUrl: string | null
  spriteBackUrl: string | null
  spriteAnimatedFrontUrl?: string | null
  spriteAnimatedBackUrl?: string | null
  currentHp: number
  maxHp: number
  battleMoveIds: string[]
  statusEffects: Array<{
    kind: string
    remainingTurns: number
    sourceMoveId: string | null
  }>
}

export type BattlePlayerState = {
  playerId: string
  activePokemonIndex: number
  faintedCount: number
  team: BattlePokemon[]
}

export type BattleLogEntry = {
  eventId: string
  turn: number
  eventType: string
  message: string
  createdAt: string
  metadata: Record<string, string | number | boolean> | null
}

export type BattleState = {
  roomCode: string
  playerIds: [string, string]
  firstTurnStarterPlayerId: string
  phase: 'team_selection' | 'in_progress' | 'finished'
  turn: number
  turnSnapshot: {
    turn: number
    status: 'waiting_actions' | 'resolving_turn' | 'finished'
    players: BattlePlayerState[]
  }
  pendingActions: Array<
    | { playerId: string; type: 'move'; moveId: string }
    | { playerId: string; type: 'switch'; nextActivePokemonIndex: number }
  >
  battleLog: BattleLogEntry[]
  winner: string | null
}

export type PokemonCatalogItem = {
  pokedexId: number
  name: string
  types: string[]
  spriteUrl: string | null
  spriteFrontUrl?: string | null
  spriteBackUrl?: string | null
  battleMoveIds: string[]
}

export type MoveCatalogItem = {
  name: string
  type: string
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error?.code ?? 'UNKNOWN_ERROR',
      body.error?.message ?? 'Request failed',
    )
  }

  return body as T
}

export const createRoomApi = (payload: {
  playerId: string
  displayName: string
}): Promise<RoomState> => {
  return request<RoomState>('/rooms', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const joinRoomApi = (code: string, payload: {
  playerId: string
  displayName: string
}): Promise<RoomState> => {
  return request<RoomState>(`/rooms/${code}/join`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const setReadyApi = (
  code: string,
  payload: { playerId: string; isReady: boolean },
): Promise<RoomState> => {
  return request<RoomState>(`/rooms/${code}/ready`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const setTeamSelectionApi = (
  code: string,
  payload: { playerId: string; pokemonIds: number[] },
): Promise<RoomState> => {
  return request<RoomState>(`/rooms/${code}/team`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const autofillTeamApi = (
  code: string,
  payload: { playerId: string },
): Promise<RoomState> => {
  return request<RoomState>(`/rooms/${code}/autofill`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const getRoomApi = (code: string): Promise<RoomState> => {
  return request<RoomState>(`/rooms/${code}`)
}

export const getMoveCatalogApi = (
  moveNames: string[],
): Promise<{ count: number; items: MoveCatalogItem[] }> => {
  const unique = Array.from(
    new Set(moveNames.map((name) => name.trim()).filter((name) => name.length > 0)),
  )
  if (unique.length === 0) {
    return Promise.resolve({ count: 0, items: [] })
  }
  const params = new URLSearchParams({ names: unique.join(',') })
  return request<{ count: number; items: MoveCatalogItem[] }>(`/catalog/moves?${params.toString()}`)
}

export const startBattleApi = (
  code: string,
  payload: {
    playerId: string
    teams: [
      { playerId: string; pokemonIds: number[] },
      { playerId: string; pokemonIds: number[] },
    ]
  },
): Promise<BattleState> => {
  return request<BattleState>(`/rooms/${code}/start`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const submitBattleActionApi = (
  roomCode: string,
  payload: {
    playerId: string
    action:
      | { type: 'move'; moveId: string }
      | { type: 'switch'; nextActivePokemonIndex: number }
  },
): Promise<{ battle: BattleState; resolved: boolean }> => {
  return request<{ battle: BattleState; resolved: boolean }>(`/battles/${roomCode}/action`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const getBattleStateApi = (roomCode: string): Promise<BattleState> => {
  return request<BattleState>(`/battles/${roomCode}/state`)
}

export const getBattleLogApi = (
  roomCode: string,
): Promise<{ roomCode: string; turn: number; winner: string | null; battleLog: BattleLogEntry[] }> => {
  return request(`/battles/${roomCode}/log`)
}

export const getPokemonCatalogApi = async (limit = 300): Promise<PokemonCatalogItem[]> => {
  const response = await request<{ count: number; items: PokemonCatalogItem[] }>(
    `/catalog/pokemon?limit=${limit}`,
  )
  return response.items
}

export type UserProfile = {
  userId: string
  displayName: string | null
  shinyUnlocked: boolean
  createdAt: string
  updatedAt: string
}

export const getUserProfileApi = (userId: string): Promise<UserProfile> => {
  return request<UserProfile>(`/users/${encodeURIComponent(userId)}/profile`)
}

export const createShinyCheckoutApi = (payload: {
  userId: string
  displayName?: string | null
  successUrl?: string
  cancelUrl?: string
}): Promise<{ url: string; sessionId: string }> => {
  return request('/payments/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const confirmShinyCheckoutApi = (sessionId: string): Promise<{ ok: true }> => {
  return request('/payments/confirm', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export const forfeitBattleApi = (
  roomCode: string,
  payload: { playerId: string },
): Promise<BattleState> => {
  return request<BattleState>(`/battles/${roomCode}/forfeit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const getHealthApi = (): Promise<{ status: string; stripeEnabled: boolean }> => {
  return request('/health')
}
