import type { RoomState } from '../lib/api'
import type { PlayerIdentity } from '../lib/player'
import { createStore } from './createStore'

type RoomStoreState = {
  identity: PlayerIdentity
  room: RoomState | null
}

const roomStoreBase = createStore<RoomStoreState>({
  identity: {
    playerId: '',
    displayName: '',
    authProvider: 'anonymous',
  },
  room: null,
})

export const roomStore = {
  ...roomStoreBase,
  setIdentity: (identity: PlayerIdentity) => {
    roomStoreBase.setState((prev) => ({ ...prev, identity }))
  },
  setRoom: (room: RoomState | null) => {
    roomStoreBase.setState((prev) => ({ ...prev, room }))
  },
  clearRoom: () => {
    roomStoreBase.setState((prev) => ({ ...prev, room: null }))
  },
}

export const useRoomStore = roomStore.useStore
