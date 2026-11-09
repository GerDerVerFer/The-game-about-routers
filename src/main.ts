import { Application } from "pixi.js";
import { COLOR, WORLD, CAMERA, GRID } from "./Config";
import { CanvasRenderer } from "./Modules/Canvas";
import { installCameraControls } from "./Modules/Controls";
import type { NodeTypes } from "./Nodes/Types";

// Current tool mode, either "pan" for moving the camera or "connect" for linking nodes
export type ToolMode = "pan" | "connect";
type AlertType = "error" | "warning" | "success";

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

  function createAlertElement(
    message: string,
    screenX: number,
    screenY: number,
    type: AlertType,
  ) {
    const popup = document.createElement("div");
    popup.className = `alert-popup alert-${type}`;
    popup.innerText = message;

    popup.style.left = `${screenX}px`;
    popup.style.top = `${screenY}px`;

    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 1500);
  }

  function showScreenAlert(
    message: string,
    screenX: number,
    screenY: number,
    type: AlertType = "error",
  ) {
    createAlertElement(message, screenX, screenY - 20, type);
  }

  function showWorldAlert(
    message: string,
    worldX: number,
    worldY: number,
    type: AlertType = "success",
  ) {
    const screenPos = scene.camera.worldToScreen(
      worldX,
      worldY,
      app.screen.width,
      app.screen.height,
    );
    createAlertElement(message, screenPos.x, screenPos.y - 50, type);
  }

  const inspectorContent = document.getElementById("inspector-content")!;
  let currentInspectorId: string | null = null;
  let lastInspectorState: string | null = null;

  function updateInspector(nodeId: string | null, force = false) {
    if (nodeId !== currentInspectorId) {
      force = true;
    }
    currentInspectorId = nodeId;

    if (!nodeId) {
      inspectorContent.className = "empty-msg";
      inspectorContent.innerHTML =
        "Выберите устройство на схеме для просмотра деталей.<br><br><i>(ПКМ по ноде/связи — удалить)</i>";
      lastInspectorState = null;
      return;
    }

    const nodeView = scene.nodes.get(nodeId);
    if (!nodeView) return;

    const stateKey = `${nodeView.data.status}_${nodeView.data.status === "installing" ? Math.floor(nodeView.data.installationProgress * 10) : ""}`;

    if (!force && lastInspectorState === stateKey) return;
    lastInspectorState = stateKey;

    inspectorContent.className = "";
    let statusHtml = "";

    if (nodeView.data.status === "installing") {
      const percent = Math.round(nodeView.data.installationProgress * 100);
      statusHtml = `<p style="color: #ffd700;">Статус: Установка (${percent}%)</p>`;
    } else if (nodeView.data.status === "awaiting_config") {
      statusHtml = `
        <p style="color: #f59e0b; margin-bottom: 12px;">Статус: Ожидает настройки</p>
        <button id="btn-activate" style="
          background: #f59e0b; color: #171b24; border: none; 
          padding: 10px; width: 100%; border-radius: 4px; 
          font-weight: bold; cursor: pointer;
        ">Активировать</button>
      `;
    } else if (nodeView.data.status === "active") {
      statusHtml = `<p style="color: #4ade80;">Статус: Работает</p>`;
    }

    inspectorContent.innerHTML = `
      <p><strong>ID:</strong> ${nodeView.data.id}</p>
      <p><strong>Тип:</strong> ${nodeView.data.type.toUpperCase()}</p>
      <p><strong>Координаты:</strong> X: ${Math.round(nodeView.data.x)}, Y: ${Math.round(nodeView.data.y)}</p>
      <hr style="border-color: #2a2f3a; margin: 12px 0;" />
      ${statusHtml}
    `;

    if (nodeView.data.status === "awaiting_config") {
      const btn = document.getElementById("btn-activate");
      if (btn) {
        btn.addEventListener("click", () => {
          nodeView.data.status = "active";
          nodeView.updateVisuals();

          showWorldAlert(
            "Устройство активировано!",
            nodeView.data.x,
            nodeView.data.y,
            "success",
          );

          updateInspector(nodeId, true);
        });
      }
    }
  }

  updateInspector(null);

  app.ticker.add((ticker) => {
    scene.nodes.tick(ticker.deltaMS);

    if (currentInspectorId) {
      const node = scene.nodes.get(currentInspectorId);
      if (node && node.data.status !== "active") {
        updateInspector(currentInspectorId);
      }
    }
  });

  installCameraControls(
    app,
    scene,
    () => currentMode,
    () => scene.redraw(),
    (fromId, toId) => {
      scene.links.add(fromId, toId);
    },
    updateInspector,
    showScreenAlert,
  );

  document
    .querySelectorAll<HTMLButtonElement>("#catalog [data-add]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.add as NodeTypes;
        const { width, height } = app.screen;

        const center = scene.camera.screenToWorld(
          width / 2,
          height / 2,
          width,
          height,
        );

        let snappedX = Math.round(center.x / GRID.SPACING) * GRID.SPACING;
        let snappedY = Math.round(center.y / GRID.SPACING) * GRID.SPACING;

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
