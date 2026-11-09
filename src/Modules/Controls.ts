import type { Application } from "pixi.js";
import type { CanvasRenderer } from "./Canvas";
import type { ToolMode } from "../main";
import { GRID } from "../Config";
import type { NodeView } from "../Nodes/NodeView";

export function installCameraControls(
  app: Application,
  scene: CanvasRenderer,
  getMode: () => ToolMode,
  onChange: () => void,
  onConnect: (fromId: string, toId: string) => void,
  onSelectNode: (id: string | null) => void,
  onAlert: (msg: string, x: number, y: number) => void,
): () => void {
  const canvas = app.canvas as HTMLCanvasElement;
  const camera = scene.camera;

  let draggingCamera = false;
  let draggingNode: NodeView | null = null;
  let selectedNode: NodeView | null = null;
  let lastX = 0;
  let lastY = 0;

  const GRID_SNAP = GRID.SPACING;

  // for connect mode, we need to remember the first selected node
  let firstSelectedNodeId: string | null = null;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
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

    if (getMode() === "connect") {
      if (clickedNode) {
        if (clickedNode.data.status !== "active") {
          onAlert("Нельзя во время установки!", e.clientX, e.clientY);
          return;
        }

        if (!firstSelectedNodeId) {
          firstSelectedNodeId = clickedNode.data.id;
          clickedNode.alpha = 0.5;
        } else if (firstSelectedNodeId !== clickedNode.data.id) {
          onConnect(firstSelectedNodeId, clickedNode.data.id);
          const prevNode = scene.nodes.get(firstSelectedNodeId);
          if (prevNode) prevNode.alpha = 1;
          firstSelectedNodeId = null;
        }
      } else {
        if (firstSelectedNodeId) {
          const prevNode = scene.nodes.get(firstSelectedNodeId);
          if (prevNode) prevNode.alpha = 1;
          firstSelectedNodeId = null;
        }
      }
      return;
    }

    // PAN MODE
    if (getMode() === "pan") {
      if (clickedNode) {
        if (selectedNode && selectedNode !== clickedNode) {
          selectedNode.setSelected(false);
        }
        selectedNode = clickedNode;
        selectedNode.setSelected(true);
        onSelectNode(clickedNode.data.id);

        draggingNode = clickedNode;
        lastX = e.clientX;
        lastY = e.clientY;
        scene.nodes.display.addChild(clickedNode);
        canvas.style.cursor = "move";
      } else {
        if (selectedNode) {
          selectedNode.setSelected(false);
          selectedNode = null;
          onSelectNode(null);
        }
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
      if (selectedNode === draggingNode) {
        onSelectNode(draggingNode.data.id);
      }
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

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
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
    if (clickedNode) {
      if (selectedNode === clickedNode) {
        selectedNode = null;
        onSelectNode(null);
      }
      scene.links.removeByNode(clickedNode.data.id);
      scene.nodes.remove(clickedNode.data.id);
      return;
    }

    const clickedLinkId = scene.links.hitTest(worldPos.x, worldPos.y);
    if (clickedLinkId) {
      scene.links.remove(clickedLinkId);
    }
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
  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.style.cursor = getMode() === "pan" ? "grab" : "crosshair";

  return () => {
    canvas.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("contextmenu", onContextMenu);
    canvas.removeEventListener("wheel", onWheel);
  };
}
