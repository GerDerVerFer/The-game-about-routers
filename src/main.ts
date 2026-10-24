import { Application } from "pixi.js";
import { COLOR, WORLD, CAMERA, GRID } from "./Config";
import { CanvasRenderer } from "./Modules/Canvas";
import { installCameraControls } from "./Modules/Controls";
import type { NodeTypes } from "./Nodes/Types";

async function init() {
  // App init
  const app = new Application();

  await app.init({
    backgroundColor: COLOR.BG,
    resizeTo: window,
    antialias: true,
  });
  document.body.appendChild(app.canvas);

  // Canvas settings
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

  document
    .querySelectorAll<HTMLButtonElement>("#toolbar [data-add]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.add as NodeTypes;
        const { width, height } = app.screen;
        // Центр экрана в мировых координатах
        const center = scene.camera.screenToWorld(
          width / 2,
          height / 2,
          width,
          height,
        );
        scene.nodes.add(kind, center.x, center.y);
      });
    });
}
await init();
