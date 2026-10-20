import { Application, Container, Graphics } from "pixi.js";
import { Camera, type CameraOptions } from "./Camera";
import { GridRenderer, type GridOptions } from "./GridRenderer";
import { COLOR } from "../Config";

// Main canvas renderer class.
// Manages the camera, grid, and world objects
export class CanvasRenderer {
  // Scene states
  readonly camera: Camera;
  readonly grid: GridRenderer;
  readonly world = new Container();
  readonly bounds = new Graphics();

  constructor(
    private app: Application,
    cameraOptions: CameraOptions,
    gridOptions: GridOptions,
  ) {
    this.camera = new Camera(cameraOptions);
    this.grid = new GridRenderer(this.camera, gridOptions);

    // Draw the world bounds rectangle
    this.bounds
      .rect(0, 0, cameraOptions.worldWidth, cameraOptions.worldHeight)
      .stroke({ color: COLOR.WORLD_BORDER, width: 2 });

    this.app.stage.addChild(this.bounds, this.grid.display, this.world);
  }

  // Main drawing function, called on every drag or zoom event
  redraw(): void {
    const { width, height } = this.app.screen;
    this.camera.clamp(width, height);

    this.world.x = width / 2 - this.camera.x * this.camera.zoom;
    this.world.y = height / 2 - this.camera.y * this.camera.zoom;
    this.world.scale.set(this.camera.zoom);

    this.grid.update(width, height);
  }
}
