import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { NODE_LABELS, type Node } from "./Types";

const Size = 64;

export class NodeView extends Container {
  public readonly data: Node;

  constructor(data: Node) {
    super();
    this.data = data;
    this.x = data.x;
    this.y = data.y;

    // Pixi settings for interactivity
    this.eventMode = "static";
    this.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(-Size / 2, -Size / 2, Size, Size, 8)
      .fill({ color: 0x2a2f3a })
      .stroke({ color: 0x4a505c, width: 2 });

    const label = new Text({
      text: NODE_LABELS[data.type],
      style: new TextStyle({
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        fill: 0xcfd5de,
      }),
    });
    label.anchor.set(0.5);
    label.y = Size / 2 + 12;

    this.addChild(bg, label);
  }
}
