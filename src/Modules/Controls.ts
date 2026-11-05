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

  let draggingCamera = false;
  let draggingNode: {
    data: { x: number; y: number };
    x: number;
    y: number;
  } | null = null;
  let lastX = 0;
  let lastY = 0;

  const GRID_SNAP = 24;

  // for connect mode, we need to remember the first selected node
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

    // CONNECT MODE LOGIC
    if (getMode() === "connect") {
      if (clickedNode) {
        if (!firstSelectedNodeId) {
          // Save the first selected node's ID and provide visual feedback
          firstSelectedNodeId = clickedNode.data.id;
          clickedNode.alpha = 0.5; // Feedback for selection
        } else if (firstSelectedNodeId !== clickedNode.data.id) {
          // Second node clicked, emit the connection event
          onConnect(firstSelectedNodeId, clickedNode.data.id);

          // Сбрасываем выделение
          const prevNode = scene.nodes.get(firstSelectedNodeId);
          if (prevNode) prevNode.alpha = 1;
          firstSelectedNodeId = null;
        }
      } else {
        // Resetting selection if clicked on empty space
        if (firstSelectedNodeId) {
          const prevNode = scene.nodes.get(firstSelectedNodeId);
          if (prevNode) prevNode.alpha = 1;
          firstSelectedNodeId = null;
        }
      }
      return; // Connect mode freezes other interactions, so we exit early
    }

    // PAN MODE LOGIC
    if (getMode() === "pan") {
      if (clickedNode) {
        draggingNode = clickedNode;
        lastX = e.clientX;
        lastY = e.clientY;
        scene.nodes.display.addChild(clickedNode);
        canvas.style.cursor = "move";
      } else {
        // Moving the camera if empty space is clicked
        draggingCamera = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.style.cursor = "grabbing";
      }
    }
  };

  const onMove = (e: PointerEvent) => {
    if (draggingCamera) {
      camera.x -= (e.clientX - lastX) / camera.zoom;
      camera.y -= (e.clientY - lastY) / camera.zoom;
      lastX = e.clientX;
      lastY = e.clientY;
      onChange();
    } else if (draggingNode) {
      const dx = (e.clientX - lastX) / camera.zoom;
      const dy = (e.clientY - lastY) / camera.zoom;

      draggingNode.data.x += dx;
      draggingNode.data.y += dy;
      draggingNode.x = draggingNode.data.x;
      draggingNode.y = draggingNode.data.y;

      lastX = e.clientX;
      lastY = e.clientY;
      scene.links.redraw();
    }
  };

  const onUp = () => {
    if (draggingNode) {
      const snappedX = Math.round(draggingNode.data.x / GRID_SNAP) * GRID_SNAP;
      const snappedY = Math.round(draggingNode.data.y / GRID_SNAP) * GRID_SNAP;

      draggingNode.data.x = snappedX;
      draggingNode.data.y = snappedY;
      draggingNode.x = snappedX;
      draggingNode.y = snappedY;
      scene.links.redraw();
      draggingNode = null;
    }

    draggingCamera = false;
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
