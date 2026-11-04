import { CAMERA } from "../Config";
import type { Application, FederatedPointerEvent } from "pixi.js";
import type { CanvasRenderer } from "./Canvas";

// Interface for camera options
export interface CameraOptions {
  worldWidth: number;
  worldHeight: number;
  minZoom?: number;
  maxZoom?: number;
}

// Class representing a camera in a 2D world
export class Camera {
  x: number;
  y: number;
  zoom = 1;

  // Constatns of the world and zoom limits
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly minZoom: number;
  readonly maxZoom: number;

  constructor(options: CameraOptions) {
    this.worldWidth = options.worldWidth;
    this.worldHeight = options.worldHeight;
    this.minZoom = options.minZoom ?? CAMERA.MIN_ZOOM;
    this.maxZoom = options.maxZoom ?? CAMERA.MAX_ZOOM;

    // Initialize camera position to the center of the world
    this.x = this.worldWidth / 2;
    this.y = this.worldHeight / 2;
  }

  // Constrain the camera's position and zoom level within the world boundaries
  clamp(viewW: number, viewH: number): void {
    const halfW = viewW / (2 * this.zoom);
    const halfH = viewH / (2 * this.zoom);

    // Check if the world is smaller than the view, and adjust the camera position accordingly
    this.x =
      halfW * 2 >= this.worldWidth
        ? this.worldWidth / 2
        : Math.min(this.worldWidth - halfW, Math.max(halfW, this.x));

    this.y =
      halfH * 2 >= this.worldHeight
        ? this.worldHeight / 2
        : Math.min(this.worldHeight - halfH, Math.max(halfH, this.y));
  }

  // Coordinates convertors for changing between screen and world coordinates
  // Convert screen coordinates to world coordinates
  screenToWorld(sx: number, sy: number, viewW: number, viewH: number) {
    return {
      x: this.x + (sx - viewW / 2) / this.zoom,
      y: this.y + (sy - viewH / 2) / this.zoom,
    };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(wx: number, wy: number, viewW: number, viewH: number) {
    return {
      x: (wx - this.x) * this.zoom + viewW / 2,
      y: (wy - this.y) * this.zoom + viewH / 2,
    };
  }
}

export type ToolMode = "pan" | "connect";

export function installCameraControls(
  app: Application,
  scene: CanvasRenderer,
  onChange: () => void,
  getMode: () => ToolMode,
  onConnect: (fromId: string, toId: string) => void,
): () => void {
  const camera = scene.camera;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;

  const onStageDown = (e: FederatedPointerEvent) => {
    if (e.target === app.stage && getMode() === "pan") {
      dragging = true;
      lastX = e.global.x;
      lastY = e.global.y;
      app.canvas.style.cursor = "grabbing";
    }
  };

  const onStageMove = (e: FederatedPointerEvent) => {
    if (!dragging) return;
    camera.x -= (e.global.x - lastX) / camera.zoom;
    camera.y -= (e.global.y - lastY) / camera.zoom;
    lastX = e.global.x;
    lastY = e.global.y;
    onChange();
  };

  const onStageUp = () => {
    dragging = false;
    app.canvas.style.cursor = getMode() === "pan" ? "grab" : "crosshair";
  };

  const canvas = app.canvas as HTMLCanvasElement;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const viewW = app.screen.width;
    const viewH = app.screen.height;
    const before = camera.screenToWorld(sx, sy, viewW, viewH);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;

    camera.zoom = Math.min(
      camera.maxZoom,
      Math.max(camera.minZoom, camera.zoom * factor),
    );
    camera.x = before.x - (sx - viewW / 2) / camera.zoom;
    camera.y = before.y - (sy - viewH / 2) / camera.zoom;
    onChange();
  };
  canvas.addEventListener("wheel", onWheel, { passive: false });

  let selectedNodeId: string | null = null;
  const onNodeDown = (e: FederatedPointerEvent) => {
    e.stopPropagation();
    const nodeView = e.currentTarget as unknown as {
      data: { id: string };
      alpha: number;
    };
    const nodeId = nodeView.data.id;

    if (getMode() !== "connect") return;
    if (!selectedNodeId) {
      selectedNodeId = nodeId;
      nodeView.alpha = 0.5;
    } else if (selectedNodeId !== nodeId) {
      onConnect(selectedNodeId, nodeId);
      const previousNode = scene.nodes.get(selectedNodeId);
      if (previousNode) previousNode.alpha = 1;
      selectedNodeId = null;
    }
  };

  app.stage.on("pointerdown", onStageDown);
  app.stage.on("globalpointermove", onStageMove);
  app.stage.on("pointerup", onStageUp);
  app.stage.on("pointerupoutside", onStageUp);
  scene.nodes.getAll().forEach((node) => node.on("pointerdown", onNodeDown));

  app.canvas.style.cursor = "grab";

  return () => {
    app.stage.off("pointerdown", onStageDown);
    app.stage.off("globalpointermove", onStageMove);
    app.stage.off("pointerup", onStageUp);
    app.stage.off("pointerupoutside", onStageUp);
    scene.nodes.getAll().forEach((node) => node.off("pointerdown", onNodeDown));
    canvas.removeEventListener("wheel", onWheel);
  };
}
