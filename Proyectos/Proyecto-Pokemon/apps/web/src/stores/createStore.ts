import { useSyncExternalStore } from 'react'

type Listener = () => void

export const createStore = <TState>(initialState: TState) => {
  let state = initialState
  const listeners = new Set<Listener>()

  const getState = () => state

  const setState = (next: TState | ((prev: TState) => TState)) => {
    state = typeof next === 'function' ? (next as (prev: TState) => TState)(state) : next
    listeners.forEach((listener) => listener())
  }

  const subscribe = (listener: Listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const useStore = <TSelected,>(selector: (value: TState) => TSelected): TSelected => {
    return useSyncExternalStore(subscribe, () => selector(getState()), () => selector(getState()))
  }

  return {
    getState,
    setState,
    subscribe,
    useStore,
  }
}
