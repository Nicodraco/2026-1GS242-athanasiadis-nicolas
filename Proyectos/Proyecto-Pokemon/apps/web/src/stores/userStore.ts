import type { UserProfile } from '../lib/api'
import { createStore } from './createStore'

type UserStoreState = {
  profile: UserProfile | null
  preferShiny: boolean
}

const SHINY_PREF_KEY = 'pbr.preferShiny'

const initialPrefer = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  return window.localStorage.getItem(SHINY_PREF_KEY) === '1'
}

const userStoreBase = createStore<UserStoreState>({
  profile: null,
  preferShiny: initialPrefer(),
})

export const userStore = {
  ...userStoreBase,
  setProfile: (profile: UserProfile | null) => {
    userStoreBase.setState((prev) => ({ ...prev, profile }))
  },
  setPreferShiny: (preferShiny: boolean) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SHINY_PREF_KEY, preferShiny ? '1' : '0')
    }
    userStoreBase.setState((prev) => ({ ...prev, preferShiny }))
  },
  clear: () => {
    userStoreBase.setState({ profile: null, preferShiny: false })
  },
}

export const useUserStore = userStore.useStore
