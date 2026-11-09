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

  const inspectorContent = document.getElementById("inspector-content")!;
  let currentInspectorId: string | null = null;

  function updateInspector(nodeId: string | null) {
    currentInspectorId = nodeId;

    if (!nodeId) {
      inspectorContent.className = "empty-msg";
      inspectorContent.innerHTML =
        "Выберите устройство на схеме для просмотра деталей.<br><br><i>(ПКМ по ноде/связи — удалить)</i>";
      return;
    }

    const nodeView = scene.nodes.get(nodeId);
    if (nodeView) {
      inspectorContent.className = "";
      const isInstalling = nodeView.data.status === "installing";
      const statusText = isInstalling
        ? `Установка (${Math.round(nodeView.data.installationProgress * 100)}%)`
        : "Работает";
      const statusColor = isInstalling ? "#ffd700" : "#4ade80";

      inspectorContent.innerHTML = `
        <p><strong>ID:</strong> ${nodeView.data.id}</p>
        <p><strong>Тип:</strong> ${nodeView.data.type.toUpperCase()}</p>
        <p><strong>Координаты:</strong> X: ${Math.round(nodeView.data.x)}, Y: ${Math.round(nodeView.data.y)}</p>
        <hr style="border-color: #2a2f3a; margin: 12px 0;" />
        <p style="color: ${statusColor};">Статус: ${statusText}</p>
      `;
    }
  }
  function showAlert(message: string, screenX: number, screenY: number) {
    const popup = document.createElement("div");
    popup.className = "alert-popup";
    popup.innerText = message;

    popup.style.left = `${screenX}px`;
    popup.style.top = `${screenY}px`;

    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 1500);
  }

  updateInspector(null);

  app.ticker.add((ticker) => {
    scene.nodes.tick(ticker.deltaMS);

    if (currentInspectorId) {
      const node = scene.nodes.get(currentInspectorId);
      if (node && node.data.status === "installing") {
        updateInspector(currentInspectorId);
      }
    }
  });

  // Changing controls
  installCameraControls(
    app,
    scene,
    () => currentMode,
    () => scene.redraw(),
    (fromId, toId) => {
      scene.links.add(fromId, toId);
    },
    updateInspector,
    showAlert,
  );

  // Add nodes to the scene when clicking the catalog buttons
  document
    .querySelectorAll<HTMLButtonElement>("#catalog [data-add]")
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

        let snappedX = Math.round(center.x / GRID.SPACING) * GRID.SPACING;
        let snappedY = Math.round(center.y / GRID.SPACING) * GRID.SPACING;

        // Find an unoccupied grid cell so nodes do not overlap.
        let isOccupied = true;
        while (isOccupied) {
          isOccupied = scene.nodes
            .getAll()
            .some(
              (node) => node.data.x === snappedX && node.data.y === snappedY,
            );
          if (isOccupied) {
            snappedX += GRID.SPACING;
            snappedY += GRID.SPACING;
          }
        }

        scene.nodes.add(kind, snappedX, snappedY);
      });
    });
  scene.redraw();
}

await init();
