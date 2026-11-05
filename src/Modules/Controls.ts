import type { Application } from "pixi.js";
import type { CanvasRenderer } from "./Canvas";
import type { ToolMode } from "../main";

export function installCameraControls(
  app: Application,
  scene: CanvasRenderer,
  getMode: () => ToolMode,
  onChange: () => void,
  onConnect: (fromId: string, toId: string) => void,
): () => void {
  const canvas = app.canvas as HTMLCanvasElement;
  const camera = scene.camera;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  // Для режима Connect: храним id первой выбранной ноды
  let firstSelectedNodeId: string | null = null;

  const onDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const worldPos = camera.screenToWorld(
      sx,
      sy,
      app.screen.width,
      app.screen.height,
    );
    const clickedNode = scene.nodes.hitTest(worldPos.x, worldPos.y);

    // === ЛОГИКА ДЛЯ РЕЖИМА CONNECT ===
    if (getMode() === "connect") {
      if (clickedNode) {
        if (!firstSelectedNodeId) {
          // Первый клик - запоминаем ноду
          firstSelectedNodeId = clickedNode.data.id;
          clickedNode.alpha = 0.5; // Визуальный отклик
        } else if (firstSelectedNodeId !== clickedNode.data.id) {
          // Второй клик - создаем связь
          onConnect(firstSelectedNodeId, clickedNode.data.id);

          // Сбрасываем выделение
          const prevNode = scene.nodes.get(firstSelectedNodeId);
          if (prevNode) prevNode.alpha = 1;
          firstSelectedNodeId = null;
        }
      } else {
        // Кликнули в пустоту в режиме Connect - сбрасываем выбор
        if (firstSelectedNodeId) {
          const prevNode = scene.nodes.get(firstSelectedNodeId);
          if (prevNode) prevNode.alpha = 1;
          firstSelectedNodeId = null;
        }
      }
      return; // В режиме connect камеру не таскаем
    }

    // === ЛОГИКА ДЛЯ РЕЖИМА PAN ===
    if (getMode() === "pan") {
      if (!clickedNode) {
        // Кликнули в пустоту - таскаем камеру
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.style.cursor = "grabbing";
      } else {
        // Кликнули по ноде в режиме pan - (здесь можно добавить перетаскивание ноды, но пока игнорируем)
      }
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    camera.x -= (e.clientX - lastX) / camera.zoom;
    camera.y -= (e.clientY - lastY) / camera.zoom;
    lastX = e.clientX;
    lastY = e.clientY;
    onChange();
  };

  const onUp = () => {
    dragging = false;
    canvas.style.cursor = getMode() === "pan" ? "grab" : "crosshair";
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const viewW = app.screen.width;
    const viewH = app.screen.height;
    const cx = viewW / 2,
      cy = viewH / 2;

    const before = camera.screenToWorld(sx, sy, viewW, viewH);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    camera.zoom = Math.min(
      camera.maxZoom,
      Math.max(camera.minZoom, camera.zoom * factor),
    );
    camera.x = before.x - (sx - cx) / camera.zoom;
    camera.y = before.y - (sy - cy) / camera.zoom;

    onChange();
  };

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.style.cursor = getMode() === "pan" ? "grab" : "crosshair";

  return () => {
    canvas.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("wheel", onWheel);
  };
}
