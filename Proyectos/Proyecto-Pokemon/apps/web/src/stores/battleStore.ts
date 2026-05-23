import type { BattleLogEntry, BattleState } from '../lib/api'
import { createStore } from './createStore'

type BattleStoreState = {
  battle: BattleState | null
  log: BattleLogEntry[]
}

const battleStoreBase = createStore<BattleStoreState>({
  battle: null,
  log: [],
})

export const battleStore = {
  ...battleStoreBase,
  setBattle: (battle: BattleState | null) => {
    battleStoreBase.setState((prev) => ({
      ...prev,
      battle,
      log: battle?.battleLog ?? prev.log,
    }))
  },
  setLog: (log: BattleLogEntry[]) => {
    battleStoreBase.setState((prev) => ({ ...prev, log }))
  },
  clear: () => {
    battleStoreBase.setState({
      battle: null,
      log: [],
    })
  },
}

export const useBattleStore = battleStore.useStore
