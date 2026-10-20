import type { Application } from "pixi.js";
import type { Camera } from "./Camera";

export function installCameraControls(
  app: Application,
  camera: Camera,
  onChange: () => void,
): () => void {
  const canvas = app.canvas as HTMLCanvasElement;
  let dragging = false;
  let lastX = 0,
    lastY = 0;

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = "grabbing";
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
    canvas.style.cursor = "grab";
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
  canvas.style.cursor = "grab";

  return () => {
    canvas.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("wheel", onWheel);
  };
}
