import { CAMERA } from "../Config";

// Interface for camera options
export interface CameraOptions {
  worldWidth: number;
  worldHeight: number;
  minZoom?: number;
  maxZoom?: number;
}

// Class representing a camera in a 2D world
export class Camera {
  x: number;
  y: number;
  zoom = 1;

  // Constatns of the world and zoom limits
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly minZoom: number;
  readonly maxZoom: number;

  constructor(options: CameraOptions) {
    this.worldWidth = options.worldWidth;
    this.worldHeight = options.worldHeight;
    this.minZoom = options.minZoom ?? CAMERA.MIN_ZOOM;
    this.maxZoom = options.maxZoom ?? CAMERA.MAX_ZOOM;

    // Initialize camera position to the center of the world
    this.x = this.worldWidth / 2;
    this.y = this.worldHeight / 2;
  }

  // Constrain the camera's position and zoom level within the world boundaries
  clamp(viewW: number, viewH: number): void {
    const halfW = viewW / (2 * this.zoom);
    const halfH = viewH / (2 * this.zoom);

    // Check if the world is smaller than the view, and adjust the camera position accordingly
    this.x =
      halfW * 2 >= this.worldWidth
        ? this.worldWidth / 2
        : Math.min(this.worldWidth - halfW, Math.max(halfW, this.x));

    this.y =
      halfH * 2 >= this.worldHeight
        ? this.worldHeight / 2
        : Math.min(this.worldHeight - halfH, Math.max(halfH, this.y));
  }

  // Coordinates convertors for changing between screen and world coordinates
  // Convert screen coordinates to world coordinates
  screenToWorld(sx: number, sy: number, viewW: number, viewH: number) {
    return {
      x: this.x + (sx - viewW / 2) / this.zoom,
      y: this.y + (sy - viewH / 2) / this.zoom,
    };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(wx: number, wy: number, viewW: number, viewH: number) {
    return {
      x: (wx - this.x) * this.zoom + viewW / 2,
      y: (wy - this.y) * this.zoom + viewH / 2,
    };
  }
}
