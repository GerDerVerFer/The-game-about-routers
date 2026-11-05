import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { NODE_LABELS, type Node } from "./Types";
import { COLOR, NODE } from "../Config";

const Size = NODE.SIZE;

export class NodeView extends Container {
  public readonly data: Node;
  private bg: Graphics;

  constructor(data: Node) {
    super();
    this.data = data;
    this.x = data.x;
    this.y = data.y;

    // BG for node
    this.bg = new Graphics()
      .roundRect(-Size / 2, -Size / 2, Size, Size, 8)
      .fill({ color: COLOR.NODE_BG })
      .stroke({ color: COLOR.NODE_BORDER, width: NODE.BORDER_WIDTH });

    const label = new Text({
      text: NODE_LABELS[data.type],
      style: new TextStyle({
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        fill: COLOR.NODE_TEXT,
      }),
    });
    label.anchor.set(0.5);
    label.y = Size / 2 + 12;

    this.addChild(this.bg, label);
  }

  // Method to update the selection state of the node
  setSelected(selected: boolean) {
    this.bg.clear();
    this.bg
      .roundRect(-Size / 2, -Size / 2, Size, Size, 8)
      .fill({ color: COLOR.NODE_BG })
      .stroke({
        color: selected ? COLOR.NODE_BORDER_SELECTED : COLOR.NODE_BORDER,
        width: selected ? NODE.BORDER_WIDTH_SELECTED : NODE.BORDER_WIDTH,
      });
  }
}
