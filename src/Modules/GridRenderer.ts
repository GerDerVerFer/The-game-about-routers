import { Graphics } from "pixi.js";
import type { Camera } from "./Camera.ts";

// Interface for grid rendering options
export interface GridOptions {
  spacing: number;
  radius: number;
  color: number;
  alpha: number;
}

// Class responsible for rendering a grid based on the camera's position and zoom level
export class GridRenderer {
  readonly display = new Graphics(); // PIXI node for rendering the grid

  constructor(
    private camera: Camera, // The camera instance used to determine the grid's position and zoom
    private options: GridOptions,
  ) {}

  // Main method to update the grid rendering based on the camera's current state and the view
  update(viewW: number, viewH: number): void {
    const g = this.display;
    g.clear();

    // Easier access to options and camera properties
    const { spacing, radius, color, alpha } = this.options;
    const { worldWidth, worldHeight, zoom, x: camX, y: camY } = this.camera;

    const halfW = viewW / (2 * zoom);
    const halfH = viewH / (2 * zoom);

    // Calculating the range of points to draw
    // Based on the camera's position and zoom
    const fromX = Math.max(0, Math.floor((camX - halfW) / spacing) * spacing);
    const toX = Math.min(
      worldWidth,
      Math.ceil((camX + halfW) / spacing) * spacing,
    );

    const fromY = Math.max(0, Math.floor((camY - halfH) / spacing) * spacing);
    const toY = Math.min(
      worldHeight,
      Math.ceil((camY + halfH) / spacing) * spacing,
    );

    // Drawing the grid points based on the calculated range
    for (let wx = fromX; wx <= toX; wx += spacing) {
      for (let wy = fromY; wy <= toY; wy += spacing) {
        const sx = (wx - camX) * zoom + viewW / 2;
        const sy = (wy - camY) * zoom + viewH / 2;
        g.circle(sx, sy, radius);
      }
    }
    g.fill({ color, alpha });
  }
}
