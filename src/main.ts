import { Application } from "pixi.js";
import { COLOR, WORLD, CAMERA, GRID, ECONOMY } from "./Config";
import { CanvasRenderer } from "./Modules/Canvas";
import { installCameraControls } from "./Modules/Controls";
import {
  ClientNode,
  ExternalNode,
  ServerNode,
  RouterNode,
  FirewallNode,
  type NodeTypes,
} from "./Nodes/Types";

export type ToolMode = "pan" | "connect";
type AlertType = "error" | "warning" | "success" | "info";

async function init() {
  const app = new Application();
  let isGameOver = false;
  let bankruptTimer = 0;

  const hackMessages = [
    "Взлом! Кажется это была не картинка.",
    "Взлом! Пароль был '123456'?",
    "Взлом! !#&$^YWDCTT&&#@&.",
    "Взлом! У вас в 21 порт дует!",
    "Взлом! sudo rm -rf /",
    "Взлом! Я тебя люблю!",
    "Взлом! Может поставить Фаервол?",
  ];

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

  // --- UI ---
  let currentMode: ToolMode = "pan";
  const panBtn = document.getElementById("mode-pan")!;
  const connectBtn = document.getElementById("mode-connect")!;
  const inspectorContent = document.getElementById("inspector-content")!;

  let currentInspectorId: string | null = null;
  let lastInspectorState: string | null = null;

  let budget = ECONOMY.START_BUDGET;
  let currentUpkeep = 0;
  let timeSinceLastFinanceTick = 0;

  let currentIncome = 0;
  let actualIncomeAccumulator = 0;

  const budgetEl = document.getElementById("ui-budget")!;
  const incomeEl = document.getElementById("ui-income")!;
  const upkeepEl = document.getElementById("ui-upkeep")!;

  // --- HELPERS ---
  function updateFinanceUI() {
    budgetEl.innerText = `$${Math.floor(budget)}`;
    budgetEl.style.color = budget >= 0 ? "#4ade80" : "#f87171";
    incomeEl.innerText = `+$${currentIncome}/с`;
    upkeepEl.innerText = `-$${currentUpkeep}/с`;
  }

  function setMode(mode: ToolMode) {
    currentMode = mode;
    panBtn.classList.toggle("active", mode === "pan");
    connectBtn.classList.toggle("active", mode === "connect");
    app.canvas.style.cursor = mode === "pan" ? "grab" : "crosshair";

    if (mode === "pan") {
      controls.resetSelection();
    }
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
    setTimeout(() => popup.remove(), 2000);
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

  // --- INSPECTOR ---
  function updateInspector(nodeId: string | null, force = false) {
    if (nodeId !== currentInspectorId) force = true;
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

    const loadRounded =
      "currentLoad" in nodeView.data
        ? Math.floor(nodeView.data.currentLoad)
        : "";
    const rebootRounded =
      "rebootTimer" in nodeView.data
        ? Math.floor(nodeView.data.rebootTimer / 100)
        : "";
    const installProgress =
      nodeView.data.status === "installing"
        ? Math.floor(nodeView.data.installationProgress * 10)
        : "";
    const stateKey = `${nodeView.data.status}_${loadRounded}_${rebootRounded}_${installProgress}`;
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
        <button id="btn-activate" style="background: #f59e0b; color: #171b24; border: none; padding: 10px; width: 100%; border-radius: 4px; font-weight: bold; cursor: pointer;">Активировать</button>
      `;
    } else if (nodeView.data.status === "active") {
      statusHtml = `<p style="color: #4ade80; margin-bottom: 12px;">Статус: Работает</p>`;

      // Load visualization
      if (
        "maxCapacity" in nodeView.data &&
        "currentLoad" in nodeView.data &&
        nodeView.data.maxCapacity > 0
      ) {
        const loadPercent = Math.round(
          (nodeView.data.currentLoad / nodeView.data.maxCapacity) * 100,
        );
        let loadColor = "#4ade80";
        if (loadPercent > 80) loadColor = "#ef4444";
        else if (loadPercent > 50) loadColor = "#f59e0b";

        statusHtml += `<p style="margin-top: 8px;">Нагрузка: <span style="color: ${loadColor};">${Math.floor(nodeView.data.currentLoad)} / ${nodeView.data.maxCapacity}</span></p>`;
      }

      // FW settings
      if (nodeView.data instanceof FirewallNode) {
        const ruleColor = nodeView.data.blockMalicious ? "#ef4444" : "#636973";
        const ruleText = nodeView.data.blockMalicious
          ? "Блокировка вирусов: ВКЛ"
          : "Блокировка вирусов: ВЫКЛ";
        statusHtml += `<button id="btn-firewall-rule" style="background: ${ruleColor}; color: #fff; border: none; padding: 10px; width: 100%; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 8px;">${ruleText}</button>`;
      }

      statusHtml += `<button id="btn-toggle" style="background: #636973; color: #fff; border: none; padding: 10px; width: 100%; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 8px;">Выключить устройство</button>`;
    } else if (nodeView.data.status === "rebooting") {
      const rebootPercent = Math.round(
        (1 - nodeView.data.rebootTimer / nodeView.data.rebootDuration) * 100,
      );
      statusHtml = `<p style="color: #ef4444; font-weight: bold; margin-bottom: 12px;">Перезагрузка (${rebootPercent}%)</p>`;
    } else if (nodeView.data.status === "disabled") {
      statusHtml = `<p style="color: #636973; margin-bottom: 12px;">Статус: Выключено</p>`;
      statusHtml += `<button id="btn-toggle" style="background: #4ade80; color: #171b24; border: none; padding: 10px; width: 100%; border-radius: 4px; font-weight: bold; cursor: pointer;">Включить</button>`;
    }

    inspectorContent.innerHTML = `
      <p><strong>ID:</strong> ${nodeView.data.id}</p>
      <p><strong>Тип:</strong> ${nodeView.data.type.toUpperCase()}</p>
      <p><strong>Координаты:</strong> X: ${Math.round(nodeView.data.x)}, Y: ${Math.round(nodeView.data.y)}</p>
      <hr style="border-color: #2a2f3a; margin: 12px 0;" />
      ${statusHtml}
    `;

    if (nodeView.data.status === "awaiting_config") {
      document.getElementById("btn-activate")?.addEventListener("click", () => {
        nodeView.data.status = "active";
        nodeView.data.isUsed = true;
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

    if (
      nodeView.data instanceof FirewallNode &&
      nodeView.data.status === "active"
    ) {
      const fwNode = nodeView.data;

      document
        .getElementById("btn-firewall-rule")
        ?.addEventListener("click", () => {
          fwNode.blockMalicious = !fwNode.blockMalicious;
          updateInspector(nodeId, true);
        });
    }

    if (
      nodeView.data.status === "active" ||
      nodeView.data.status === "disabled"
    ) {
      document.getElementById("btn-toggle")?.addEventListener("click", () => {
        if (nodeView.data.status === "active") {
          nodeView.data.status = "disabled";
          showWorldAlert(
            "Устройство выключено",
            nodeView.data.x,
            nodeView.data.y,
            "info",
          );
        } else {
          nodeView.data.status = "active";
          nodeView.data.isUsed = true;
          showWorldAlert(
            "Устройство включено",
            nodeView.data.x,
            nodeView.data.y,
            "success",
          );
        }
        nodeView.updateVisuals();
        updateInspector(nodeId, true);
      });
    }
  }

  // --- PACKET LOGIC ---
  scene.packets.onServerReceiveRequest = (requestPacket) => {
    if (requestPacket.type === "malicious") return; // Сервер не отвечает на вирусы

    const server = scene.nodes.get(requestPacket.targetId);
    const client = scene.nodes.get(requestPacket.sourceId);

    if (server && client) {
      const returnPath = scene.links.findPathTo(client.data.id, server.data.id);
      if (returnPath) {
        scene.packets.spawn(
          returnPath,
          "data",
          server.data.id,
          client.data.id,
          true,
        );
      }
    }
  };

  scene.packets.onPacketArrive = (packet) => {
    if (packet.type === "data") {
      budget += ECONOMY.INCOME_PER_CLIENT;
      actualIncomeAccumulator += ECONOMY.INCOME_PER_CLIENT;
    } else if (packet.type === "malicious") {
      budget -= ECONOMY.PENALTY;
      const serverNode = scene.nodes.get(packet.path[packet.path.length - 1]);
      if (serverNode) {
        const randomMsg =
          hackMessages[Math.floor(Math.random() * hackMessages.length)];
        showWorldAlert(
          `${randomMsg} -$${ECONOMY.PENALTY}`,
          serverNode.data.x,
          serverNode.data.y,
          "error",
        );
      }
    }
    updateFinanceUI();
  };

  scene.packets.onPacketBlocked = (packet) => {
    const blockerId = packet.path[packet.currentSegment + 1];
    const blocker = scene.nodes.get(blockerId);
    if (!blocker) return;

    // Не показываем отдельные алерты, пока устройство перезагружается.
    if (blocker.data.status === "rebooting") return;

    if (
      blocker.data instanceof RouterNode ||
      blocker.data instanceof ServerNode
    ) {
      if (
        "currentLoad" in blocker.data &&
        "maxCapacity" in blocker.data &&
        blocker.data.currentLoad >= blocker.data.maxCapacity &&
        Math.random() < 0.2
      ) {
        showWorldAlert(
          "Перегрузка! Пакет потерян",
          blocker.data.x,
          blocker.data.y,
          "warning",
        );
      }
    } else if (blocker.data instanceof FirewallNode) {
      if (packet.type === "malicious") {
        showWorldAlert(
          "Вирус заблокирован!",
          blocker.data.x,
          blocker.data.y,
          "success",
        );
      } else {
        showWorldAlert(
          "Трафик заблокирован фаерволом",
          blocker.data.x,
          blocker.data.y,
          "warning",
        );
      }
    }
  };

  // INTERNET
  const internetSpawnX = WORLD.WIDTH / 2 - 300;
  const internetSpawnY = WORLD.HEIGHT / 2 - 200;
  const internetNode = scene.nodes.add(
    "external",
    internetSpawnX,
    internetSpawnY,
  );
  internetNode.data.status = "active";
  internetNode.data.isUsed = true;
  internetNode.updateVisuals();

  // --- GAME CYCLE ---
  app.ticker.add((ticker) => {
    scene.nodes.tick(ticker.deltaMS);
    scene.packets.tick(ticker.deltaMS);

    if (currentInspectorId) updateInspector(currentInspectorId);

    timeSinceLastFinanceTick += ticker.deltaMS;
    if (timeSinceLastFinanceTick >= 1000) {
      timeSinceLastFinanceTick -= 1000;
      if (isGameOver) return;

      const allNodes = scene.nodes.getAll();
      const activeNodes = allNodes.filter(
        (node) => node.data.status === "active",
      );

      // Counting all except internet node
      const billableNodes = activeNodes.filter(
        (node) => !(node.data instanceof ExternalNode),
      );
      currentUpkeep = billableNodes.length * ECONOMY.UPKEEP_PER_NODE;
      for (const node of activeNodes) {
        if (
          node.data instanceof ClientNode ||
          node.data instanceof ExternalNode
        ) {
          const targetServer = allNodes.find(
            (n) => n.data instanceof ServerNode && n.data.status === "active",
          );

          if (targetServer) {
            const path = scene.links.findPathTo(
              targetServer.data.id,
              node.data.id,
            );
            if (path) {
              const packetCount = node.data instanceof ExternalNode ? 3 : 1;

              for (let i = 0; i < packetCount; i++) {
                const packetType = node.data.getGeneratedPacketType();
                if (packetType) {
                  scene.packets.spawn(
                    path,
                    packetType,
                    node.data.id,
                    targetServer.data.id,
                    false,
                  );
                }
              }
            }
          }
        }
      }

      currentIncome = actualIncomeAccumulator;
      actualIncomeAccumulator = 0; // Resetting

      budget -= currentUpkeep;
      updateFinanceUI();

      if (budget < 0) {
        bankruptTimer += 1;
        budgetEl.innerText = `$${Math.floor(budget)} (${ECONOMY.BANKRUPCY_TIME - bankruptTimer}с)`;
        if (
          bankruptTimer >= ECONOMY.BANKRUPCY_TIME ||
          budget === ((ECONOMY.START_BUDGET * -1) as number)
        ) {
          isGameOver = true;
          app.ticker.stop();
          const overlay = document.createElement("div");
          overlay.id = "bankrupt-overlay";
          overlay.style.cssText =
            "position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(23,27,36,0.9); z-index:999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#f87171; font-size:32px; font-weight:bold; font-family:monospace;";
          overlay.innerHTML =
            "БАНКРОТСТВО<br><span style='font-size:16px; color:#cfd5de; margin-top:16px;'>Вы не смогли удержать сеть на плаву.</span>";
          document.body.appendChild(overlay);
        }
      } else {
        bankruptTimer = 0;
      }
    }
  });

  // --- CONTROLS ---
  panBtn.addEventListener("click", () => setMode("pan"));
  connectBtn.addEventListener("click", () => setMode("connect"));
  window.addEventListener("keydown", (e) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    if (e.code === "Digit1" || e.key === "1") setMode("pan");
    if (e.code === "Digit2" || e.key === "2") setMode("connect");
  });

  const controls = installCameraControls(
    app,
    scene,
    () => currentMode,
    () => scene.redraw(),
    (fromId, toId) => {
      const fromNode = scene.nodes.get(fromId);
      const toNode = scene.nodes.get(toId);

      if (!fromNode || !toNode) return;

      // checking if it is a server
      const fromIsServer = fromNode.data instanceof ServerNode;
      const toIsServer = toNode.data instanceof ServerNode;

      // Checking if it is a router or firewall
      const fromIsNetwork =
        fromNode.data instanceof RouterNode ||
        fromNode.data instanceof FirewallNode;
      const toIsNetwork =
        toNode.data instanceof RouterNode ||
        toNode.data instanceof FirewallNode;

      // It's now Server-(Router/Firewall)
      if ((fromIsServer && !toIsNetwork) || (toIsServer && !fromIsNetwork)) {
        showWorldAlert(
          "Сервер подключается только через Роутер/Фаервол!",
          toNode.data.x,
          toNode.data.y,
          "error",
        );
        return;
      }

      scene.links.add(fromId, toId);
    },
    updateInspector,
    (nodeId, screenX, screenY) => {
      const node = scene.nodes.get(nodeId);
      if (node) {
        const baseCost = ECONOMY.COST[node.data.type] || 0;
        const refundRate = node.data.isUsed
          ? ECONOMY.REFUND_USED
          : ECONOMY.REFUND_UNUSED;
        const refund = Math.floor(baseCost * refundRate);
        if (refund > 0) {
          budget += refund;
          updateFinanceUI();
          showScreenAlert(`Возврат: +$${refund}`, screenX, screenY, "success");
        }
      }
    },
    showScreenAlert,
  );

  document
    .querySelectorAll<HTMLButtonElement>("#catalog [data-add]")
    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const kind = btn.dataset.add as NodeTypes;
        const cost = ECONOMY.COST[kind] || 0;

        if (budget < cost) {
          showScreenAlert(
            "Недостаточно средств!",
            (e as MouseEvent).clientX,
            (e as MouseEvent).clientY,
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
            .some((n) => n.data.x === snappedX && n.data.y === snappedY);
          if (isOccupied) {
            snappedX += GRID.SPACING;
            snappedY += GRID.SPACING;
          }
        }
        scene.nodes.add(kind, snappedX, snappedY);
      });
    });

  updateInspector(null);
  updateFinanceUI();
  scene.redraw();
}

await init();
