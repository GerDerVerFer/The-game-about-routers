// ============================================================================
// WORLD CONSTANTS
export const WORLD = {
  WIDTH: 4000,
  HEIGHT: 3000,
} as const;

// ============================================================================
// CAMERA CONSTANTS
export const CAMERA = {
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 2.0,
  ZOOM_STEP: 1.1,
} as const;

// ============================================================================
// VISUAL CONSTANTS
export const COLOR = {
  BG: 0x171b24,
  WORLD_BORDER: 0x2a2f3a,
  GRID_DOT: 0x636973,
} as const;

export const GRID = {
  SPACING: 24,
  DOT_RADIUS: 1.5,
  DOT_ALPHA: 0.25,
} as const;
