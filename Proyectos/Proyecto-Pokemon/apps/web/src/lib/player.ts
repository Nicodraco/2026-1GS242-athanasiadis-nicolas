export type PlayerIdentity = {
  playerId: string
  displayName: string
  authProvider: 'anonymous' | 'clerk'
}

const PLAYER_ID_KEY = 'pbr.playerId'
const PLAYER_NAME_KEY = 'pbr.displayName'

const randomSuffix = () => Math.floor(Math.random() * 9000 + 1000).toString()

export const getOrCreatePlayerIdentity = (): PlayerIdentity => {
  if (typeof window === 'undefined') {
    return {
      playerId: 'server-player',
      displayName: 'Entrenador',
      authProvider: 'anonymous',
    }
  }

  let playerId = window.localStorage.getItem(PLAYER_ID_KEY) ?? ''
  let displayName = window.localStorage.getItem(PLAYER_NAME_KEY) ?? ''

  if (!playerId) {
    playerId = crypto.randomUUID()
    window.localStorage.setItem(PLAYER_ID_KEY, playerId)
  }

  if (!displayName) {
    displayName = `Entrenador-${randomSuffix()}`
    window.localStorage.setItem(PLAYER_NAME_KEY, displayName)
  }

  return { playerId, displayName, authProvider: 'anonymous' }
}

export const saveDisplayName = (displayName: string): void => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(PLAYER_NAME_KEY, displayName.trim())
}

export const buildClerkIdentity = (
  clerkUserId: string,
  displayName: string,
): PlayerIdentity => ({
  playerId: `clerk:${clerkUserId}`,
  displayName: displayName.slice(0, 24) || 'Entrenador',
  authProvider: 'clerk',
})
