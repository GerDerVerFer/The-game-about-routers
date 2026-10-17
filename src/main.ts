import { Application } from "pixi.js";

async function init() {
  const app = new Application();

  await app.init({
    resizeTo: window,
    backgroundColor: 0x1099bb,
  });
  document.body.appendChild(app.canvas);
}

init();
