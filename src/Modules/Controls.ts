import type { Application } from "pixi.js";
import type { Camera } from "./Camera";

export function installCameraControls(
  app: Application,
  camera: Camera,
  onChange: () => void,
): // Lambda to change camera control constants (dragging and zooming)
// for the canvas
() => void {
  const canvas = app.canvas as HTMLCanvasElement;
  let dragging = false;
  let lastX = 0,
    lastY = 0;

  // user interacting with the canvas right now
  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = "grabbing";
  };

  // user moving the mouse while interacting with the canvas
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    camera.x -= (e.clientX - lastX) / camera.zoom;
    camera.y -= (e.clientY - lastY) / camera.zoom;
    lastX = e.clientX;
    lastY = e.clientY;
    onChange();
  };

  // user stopped interacting with the canvas
  const onUp = () => {
    dragging = false;
    canvas.style.cursor = "grab";
  };

  // user is zooming in or out on the canvas
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();

    // Using bounding bc we will draw another UI,
    // so it will be better to have the mouse position relative
    // to the canvas
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const viewW = app.screen.width;
    const viewH = app.screen.height;
    const cx = viewW / 2,
      cy = viewH / 2;

    // Calculate the world coordinates before zooming
    // to maintain the position of the point under the cursor
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

  // Add event listeners for mouse and wheel events
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
