import { Application } from "pixi.js";
import { COLOR, WORLD, CAMERA, GRID } from "./Config";
import { CanvasRenderer } from "./Modules/Canvas";
import { installCameraControls } from "./Modules/Controls";
import type { NodeTypes } from "./Nodes/Types";

// Current tool mode, either "pan" for moving the camera or "connect" for linking nodes
export type ToolMode = "pan" | "connect";

async function init() {
  const app = new Application();
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

  // type setup for the current tool mode, defaulting to "pan"
  let currentMode: ToolMode = "pan";

  const panBtn = document.getElementById("mode-pan")!;
  const connectBtn = document.getElementById("mode-connect")!;

  function setMode(mode: ToolMode) {
    currentMode = mode;

    panBtn.classList.toggle("active", mode === "pan");
    connectBtn.classList.toggle("active", mode === "connect");

    app.canvas.style.cursor = mode === "pan" ? "grab" : "crosshair";
  }

  panBtn.addEventListener("click", () => setMode("pan"));
  connectBtn.addEventListener("click", () => setMode("connect"));

  // Changing controls
  installCameraControls(
    app,
    scene,
    () => currentMode,
    () => scene.redraw(),
    (fromId, toId) => {
      scene.links.add(fromId, toId);
    },
  );

  // Addding nodes to the scene when clicking the toolbar buttons
  document
    .querySelectorAll<HTMLButtonElement>("#toolbar [data-add]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.add as NodeTypes;
        const { width, height } = app.screen;

        // Получаем мировые координаты центра экрана
        const center = scene.camera.screenToWorld(
          width / 2,
          height / 2,
          width,
          height,
        );

        // Snapping nodes to the grid when adding them to the scene
        const snappedX = Math.round(center.x / GRID.SPACING) * GRID.SPACING;
        const snappedY = Math.round(center.y / GRID.SPACING) * GRID.SPACING;

        scene.nodes.add(kind, snappedX, snappedY);
      });
    });
}

await init();
