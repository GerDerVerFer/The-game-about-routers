import { Application } from "pixi.js";
import { COLOR } from "./Config.ts";

async function init() {
  // App init
  const app = new Application();

  // Canvas settings
  await app.init({
    backgroundColor: COLOR.BG,
    resizeTo: window,
    antialias: true,
  });
  document.body.appendChild(app.canvas);
}

await init();
