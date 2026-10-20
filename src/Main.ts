import { Application } from "pixi.js";
import { COLOR, WORLD, CAMERA, GRID } from "./Config.ts";
import { CanvasRenderer } from "./Modules/Canvas.ts";
import { installCameraControls } from "./Modules/Controls.ts";

async function init() {
  // App init
  const app = new Application();

  // Canvas settings
  await app.init({
    backgroundColor: COLOR.BG,
    resizeTo: window,
    antialias: true,
  });
  document.body.appendChild(app.canvas);
  const scene = new CanvasRenderer(
    app,
    {
      worldWidth: WORLD.WIDTH,
      worldHeight: WORLD.HEIGHT,
      minZoom: CAMERA.MIN_ZOOM,
      maxZoom: CAMERA.MAX_ZOOM,
    },
    {
      spacing: GRID.SPACING,
      radius: GRID.DOT_RADIUS,
      color: COLOR.GRID_DOT,
      alpha: GRID.DOT_ALPHA,
    },
  );

  installCameraControls(app, scene.camera, () => scene.redraw());
  window.addEventListener("resize", () => scene.redraw());

  scene.redraw();
}

await init();
