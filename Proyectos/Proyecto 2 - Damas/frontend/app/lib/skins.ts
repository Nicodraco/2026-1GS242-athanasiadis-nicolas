export interface SkinStyle {
  whiteFill: string;
  blackFill: string;
  ring: string;
  lightSquare: string;
  darkSquare: string;
}

const STYLES: Record<string, SkinStyle> = {
  classic: { whiteFill: '#f3e8c9', blackFill: '#1a1a1a', ring: '#000', lightSquare: '#f6f1e3', darkSquare: '#bda77a' },
  midnight: { whiteFill: '#cfd9ff', blackFill: '#0a1840', ring: '#000', lightSquare: '#e6ebff', darkSquare: '#3a4a8a' },
  slate: { whiteFill: '#ffffff', blackFill: '#2a2a2a', ring: '#000', lightSquare: '#e9e9e9', darkSquare: '#7a7a7a' },
  neon: { whiteFill: '#b8ff3a', blackFill: '#ff66c4', ring: '#000', lightSquare: '#1a1a1a', darkSquare: '#0a0a0a' },
  gold: { whiteFill: '#ffd000', blackFill: '#1a1a1a', ring: '#000', lightSquare: '#fff7d6', darkSquare: '#b89800' },
  vapor: { whiteFill: '#2bc8c0', blackFill: '#ff66c4', ring: '#000', lightSquare: '#f6f1e3', darkSquare: '#9b6cff' },
  cyberpunk: { whiteFill: '#00f2ff', blackFill: '#ff00ff', ring: '#fff', lightSquare: '#120458', darkSquare: '#000000' },
  forest: { whiteFill: '#e8f5e9', blackFill: '#2e7d32', ring: '#1b5e20', lightSquare: '#f1f8e9', darkSquare: '#558b2f' },
  ocean: { whiteFill: '#e0f7fa', blackFill: '#0277bd', ring: '#01579b', lightSquare: '#f1faff', darkSquare: '#4fc3f7' },
};

export const DEFAULT_STYLE_KEY = 'classic';

export function styleByKey(key: string | null | undefined): SkinStyle {
  if (!key) return STYLES[DEFAULT_STYLE_KEY];
  return STYLES[key] ?? STYLES[DEFAULT_STYLE_KEY];
}
