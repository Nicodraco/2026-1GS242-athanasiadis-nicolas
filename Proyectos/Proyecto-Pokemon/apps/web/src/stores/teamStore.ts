import { createStore } from './createStore'

type TeamStoreState = {
  selections: Record<string, number[]>
}

const teamStoreBase = createStore<TeamStoreState>({
  selections: {},
})

const keyFor = (roomCode: string, playerId: string): string => `${roomCode}:${playerId}`

export const teamStore = {
  ...teamStoreBase,
  setSelection: (roomCode: string, playerId: string, pokemonIds: number[]) => {
    const key = keyFor(roomCode, playerId)
    teamStoreBase.setState((prev) => ({
      ...prev,
      selections: {
        ...prev.selections,
        [key]: pokemonIds,
      },
    }))
  },
  getSelection: (roomCode: string, playerId: string): number[] => {
    return teamStoreBase.getState().selections[keyFor(roomCode, playerId)] ?? []
  },
  clearRoomSelections: (roomCode: string) => {
    teamStoreBase.setState((prev) => ({
      ...prev,
      selections: Object.fromEntries(
        Object.entries(prev.selections).filter(([key]) => !key.startsWith(`${roomCode}:`)),
      ),
    }))
  },
}

export const useTeamStore = teamStore.useStore
