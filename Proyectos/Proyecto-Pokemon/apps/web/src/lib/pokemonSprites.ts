const POKEAPI_STATIC_SPRITES_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const POKEAPI_ANIMATED_SPRITES_BASE_SHOWDOWN =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown'
const POKEAPI_ANIMATED_SPRITES_BASE_BW =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated'
const POKEAPI_SHINY_STATIC_BASE = `${POKEAPI_STATIC_SPRITES_BASE}/shiny`
const POKEAPI_SHINY_SHOWDOWN_BASE = `${POKEAPI_ANIMATED_SPRITES_BASE_SHOWDOWN}/shiny`

type SpriteOptions = {
  front?: string | null
  back?: string | null
  animated?: boolean
  preferProvided?: boolean
  shiny?: boolean
}

export const getPokemonShinySpriteUrls = (
  pokemonId: number,
  animated = true,
): { front: string; back: string } => {
  if (animated) {
    return {
      front: `${POKEAPI_SHINY_SHOWDOWN_BASE}/${pokemonId}.gif`,
      back: `${POKEAPI_SHINY_SHOWDOWN_BASE}/back/${pokemonId}.gif`,
    }
  }
  return {
    front: `${POKEAPI_SHINY_STATIC_BASE}/${pokemonId}.png`,
    back: `${POKEAPI_SHINY_STATIC_BASE}/back/${pokemonId}.png`,
  }
}

const hasAnimatedSprites = (pokemonId: number) => pokemonId > 0 && pokemonId <= 1025
const normalizeSpriteUrl = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const getPokemonStaticSpriteUrls = (
  pokemonId: number,
  provided?: { front?: string | null; back?: string | null },
): { front: string; back: string } => {
  const fallbackFront = `${POKEAPI_STATIC_SPRITES_BASE}/${pokemonId}.png`
  const fallbackBack = `${POKEAPI_STATIC_SPRITES_BASE}/back/${pokemonId}.png`
  const providedFront = normalizeSpriteUrl(provided?.front)
  const providedBack = normalizeSpriteUrl(provided?.back)

  return {
    front: providedFront ?? fallbackFront,
    back: providedBack ?? fallbackBack,
  }
}

export const getPokemonBwAnimatedSpriteUrls = (pokemonId: number): { front: string; back: string } => ({
  front: `${POKEAPI_ANIMATED_SPRITES_BASE_BW}/${pokemonId}.gif`,
  back: `${POKEAPI_ANIMATED_SPRITES_BASE_BW}/back/${pokemonId}.gif`,
})

export const getPokemonSpriteUrls = (
  pokemonId: number,
  options?: SpriteOptions,
): { front: string; back: string } => {
  if (options?.shiny) {
    const useAnimatedShiny = options?.animated !== false && hasAnimatedSprites(pokemonId)
    return getPokemonShinySpriteUrls(pokemonId, useAnimatedShiny)
  }
  const staticFallback = getPokemonStaticSpriteUrls(pokemonId)
  const providedFront = normalizeSpriteUrl(options?.front)
  const providedBack = normalizeSpriteUrl(options?.back)
  const animatedSpritesShowdown = {
    front: `${POKEAPI_ANIMATED_SPRITES_BASE_SHOWDOWN}/${pokemonId}.gif`,
    back: `${POKEAPI_ANIMATED_SPRITES_BASE_SHOWDOWN}/back/${pokemonId}.gif`,
  }
  const animatedSpritesBw = {
    front: `${POKEAPI_ANIMATED_SPRITES_BASE_BW}/${pokemonId}.gif`,
    back: `${POKEAPI_ANIMATED_SPRITES_BASE_BW}/back/${pokemonId}.gif`,
  }
  const useAnimated = Boolean(options?.animated) && hasAnimatedSprites(pokemonId)
  const preferred = useAnimated ? animatedSpritesShowdown : staticFallback
  const preferProvided = options?.preferProvided ?? true

  return {
    front: preferProvided
      ? providedFront ?? preferred.front ?? staticFallback.front
      : preferred.front ?? animatedSpritesBw.front ?? providedFront ?? staticFallback.front,
    back: preferProvided
      ? providedBack ?? preferred.back ?? staticFallback.back
      : preferred.back ?? animatedSpritesBw.back ?? providedBack ?? staticFallback.back,
  }
}

