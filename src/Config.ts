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
// Installation TIME CONSTANTS
export const INSTALL_TIME: Record<string, number> = {
  router: 5000,
  firewall: 7000,
  server: 10000,
  client: 3000,
  crypto: 8000,
  ids: 6000,
} as const;

// ============================================================================
// VISUAL CONSTANTS
export const COLOR = {
  // World
  BG: 0x171b24,
  WORLD_BORDER: 0x2a2f3a,
  GRID_DOT: 0x636973,

  // Packets
  PACKET: 0x3b82f6,
  PACKET_RESPONCE: 0x22c55e,
  PACKET_MALICIOUS: 0xef4444,

  // Node base colors
  NODE_BG: 0x1e2430,
  NODE_BORDER: 0x4a505c,
  NODE_BORDER_SELECTED: 0xffffff,
  NODE_TEXT: 0xcfd5de,

  // Blinks
  NODE_BLINK_1: 0xf43f5e,
  NODE_BLINK_2: 0xffe4e6,

  // Status colors
  NODE_ACTIVE: 0x22c55e,
  NODE_INSTALLING: 0x38bdf8,
  NODE_IN_REBOOT: 0xa855f7,
  NODE_AWAITING_CONFIG: 0xf59e0b,
  NODE_DISABLED: 0x475569,

  // Link colors
  LINK_LINE: 0x64748b,
} as const;

// ============================================================================
// GRID CONSTANTS
export const GRID = {
  SPACING: 24,
  DOT_RADIUS: 1.5,
  DOT_ALPHA: 0.25,
} as const;

// ============================================================================
// PACKET CONSTANTS
export const PACKET = {
  PACKET_ALPHA: 0.3,
  PACKET_ALPHA_MALICIOUS: 0.5,
  PACKET_WIDTH: 2,
  SPEED: 0.3, // Pixels per millisecond
} as const;

// ============================================================================
// NODE CONSTANTS
export const NODE = {
  LINK_WIDTH: 4,
  SIZE: 64,
  BORDER_RADIUS: 8,
  BORDER_WIDTH: 2,
  BORDER_WIDTH_SELECTED: 3,
  BORDER_WIDTH_REBOOTING: 4,
  LABEL_OFFSET_Y: 12,
} as const;

// ============================================================================
// ECONOMIC CONSTANTS
export const ECONOMY = {
  START_BUDGET: 5000,
  VIRUS_CHANCE: 0.15,
  PENALTY: 300,
  COST: {
    router: 500.0,
    firewall: 800.0,
    server: 2000.0,
    client: 100.0,
    crypto: 1500.0,
    ids: 1200.0,
  } as Record<string, number>,
  UPKEEP_PER_NODE: 5,
  INCOME_PER_CLIENT: 25,
  BANKRUPCY_TIME: 60, // seconds
  REFUND_USED: 0.5,
  REFUND_UNUSED: 1.0,
} as const;
