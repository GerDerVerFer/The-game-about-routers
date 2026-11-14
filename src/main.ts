import { Application } from "pixi.js";
import { COLOR, WORLD, CAMERA, GRID, ECONOMY } from "./Config";
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

  let budget = ECONOMY.START_BUDGET;
  let currentIncome = 0;
  let currentUpkeep = 0;
  let timeSinceLastFinanceTick = 0;

  const budgetEl = document.getElementById("ui-budget")!;
  const incomeEl = document.getElementById("ui-income")!;
  const upkeepEl = document.getElementById("ui-upkeep")!;

  function updateFinanceUI() {
    budgetEl.innerText = `$${Math.floor(budget)}`;
    budgetEl.style.color = budget >= 0 ? "#4ade80" : "#f87171";
    incomeEl.innerText = `+$${currentIncome}/с`;
    upkeepEl.innerText = `-$${currentUpkeep}/с`;
  }

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
    scene.packets.tick(ticker.deltaMS);

    if (currentInspectorId) {
      const node = scene.nodes.get(currentInspectorId);
      if (node && node.data.status !== "active") {
        updateInspector(currentInspectorId);
      }
    }

    timeSinceLastFinanceTick += ticker.deltaMS;
    if (timeSinceLastFinanceTick >= 1000) {
      timeSinceLastFinanceTick -= 1000;

      currentUpkeep = 0;

      const allNodes = scene.nodes.getAll();
      const activeNodes = allNodes.filter(
        (node) => node.data.status === "active",
      );
      currentUpkeep = activeNodes.length * ECONOMY.UPKEEP_PER_NODE;

      let clientsWithPath = 0;
      for (const node of activeNodes) {
        if (node.data.type === "client") {
          const path = scene.links.findPathToServer(node.data.id);
          if (path) {
            // Checking if the packet is malicious or not based on a random chance
            const isVirus = Math.random() < ECONOMY.VIRUS_CHANCE;
            const packetType = isVirus ? "malicious" : "data";

            scene.packets.spawn(path, packetType);

            // Virus packets do not contribute to income
            if (!isVirus) clientsWithPath++;
          }
        }
      }

      currentIncome = clientsWithPath * ECONOMY.INCOME_PER_CLIENT;
      budget -= currentUpkeep;
      updateFinanceUI();

      if (budget < 0 && !document.getElementById("bankrupt-overlay")) {
        const overlay = document.createElement("div");
        overlay.id = "bankrupt-overlay";
        overlay.style.cssText =
          "position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(23,27,36,0.9); z-index:999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#f87171; font-size:32px; font-weight:bold; font-family:monospace;";
        overlay.innerHTML =
          "БАНКРОТСТВО<br><span style='font-size:16px; color:#cfd5de; margin-top:16px;'>Вы не смогли удержать сеть на плаву.</span>";
        document.body.appendChild(overlay);
      }
    }
  });

  scene.packets.onPacketArrive = (packet) => {
    if (packet.type === "data") {
      // Data packet reached the server, increase budget
      budget += ECONOMY.INCOME_PER_CLIENT;
    } else if (packet.type === "malicious") {
      // malicious packet reached the server, apply penalty
      budget -= ECONOMY.PENALTY;

      const serverNode = scene.nodes.get(packet.path[packet.path.length - 1]);
      if (serverNode) {
        // Would be fun to get some funny errror message here, but for now just show a simple alert
        showWorldAlert(
          `Взлом! -$${ECONOMY.PENALTY}`,
          serverNode.data.x,
          serverNode.data.y,
          "error",
        );
      }
    }
    updateFinanceUI();
  };
  scene.packets.onPacketBlocked = (packet) => {
    // FW which blocked the malicious packet getting alert
    const fwNodeId = packet.path[packet.currentSegment + 1];
    const fwNode = scene.nodes.get(fwNodeId);
    if (fwNode) {
      showWorldAlert(
        "Вирус заблокирован!",
        fwNode.data.x,
        fwNode.data.y,
        "success",
      );
    }
  };

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
      btn.addEventListener("click", (e) => {
        const kind = btn.dataset.add as NodeTypes;
        const cost = ECONOMY.COST[kind] || 0;

        if (budget < cost) {
          const mouseEvent = e as MouseEvent;
          showScreenAlert(
            "Недостаточно средств!",
            mouseEvent.clientX,
            mouseEvent.clientY,
            "error",
          );
          return;
        }

        budget -= cost;
        updateFinanceUI();

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

  updateFinanceUI();
  scene.redraw();
}

await init();
