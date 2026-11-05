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

  // Node colors
  NODE_BG: 0x2a2f3a,
  NODE_BORDER: 0x4a505c,
  NODE_BORDER_SELECTED: 0xffffff,
  NODE_TEXT: 0xcfd5de,

  // Link colors
  LINK_LINE: 0x636973,
} as const;

// ============================================================================
// GRID CONSTANTS
export const GRID = {
  SPACING: 24,
  DOT_RADIUS: 1.5,
  DOT_ALPHA: 0.25,
} as const;

// ============================================================================
// NODE CONSTANTS
export const NODE = {
  LINK_WIDTH: 4,
  SIZE: 64,
  BORDER_RADIUS: 8,
  BORDER_WIDTH: 2,
  BORDER_WIDTH_SELECTED: 3,
  LABEL_OFFSET_Y: 12,
} as const;
