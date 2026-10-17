import { Application, Graphics } from "pixi.js";

async function init() {
  // App init
  const app = new Application();

  // Canvas settings
  await app.init({
    backgroundColor: 0x171b24,
    resizeTo: window,
    antialias: true,
  });
  const Dots = new Graphics();
  const spacing = 24;
  const dotColor = 0x636973;
  const dotAlpha = 0.25;

  for (let x = 12; x < window.innerWidth; x += spacing) {
    for (let y = 12; y < window.innerHeight; y += spacing) {
      Dots.circle(x, y, 1.5);
    }
  }
  Dots.fill({ color: dotColor, alpha: dotAlpha });
  app.stage.addChild(Dots);

  // Appending canvas
  document.body.appendChild(app.canvas);
}

await init();
