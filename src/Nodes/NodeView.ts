import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { NODE_LABELS, type Node } from "./Types";
import { COLOR, NODE } from "../Config";

const Size = NODE.SIZE;

export class NodeView extends Container {
  public readonly data: Node;
  private bg: Graphics;
  private progressBar: Graphics;
  private isSelected: boolean = false;
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

    // Addind progressbar for installation progress
    this.progressBar = new Graphics();
    this.progressBar.y = Size / 2 + 4;

    const label = new Text({
      text: NODE_LABELS[data.type],
      style: new TextStyle({
        fontFamily: "Cascadia Code",
        fontSize: 12,
        fill: COLOR.NODE_TEXT,
      }),
    });
    label.anchor.set(0.5);
    label.y = Size / 2 + 20;

    this.addChild(this.bg, label, this.progressBar);
    this.updateVisuals();
  }
  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.updateVisuals(); // Перерисовываем при изменении выделения
  }

  public updateVisuals() {
    this.bg.clear();

    // Chnaging border color based on node status
    let borderColor: number = COLOR.NODE_BORDER;
    if (this.data.status === "installing") {
      borderColor = COLOR.NODE_INSTALLING;
    } else if (this.data.status === "active") {
      borderColor = COLOR.NODE_ACTIVE;
    }

    // Filling the background and border of the node
    this.bg
      .roundRect(-Size / 2, -Size / 2, Size, Size, NODE.BORDER_RADIUS)
      .fill({ color: COLOR.NODE_BG })
      .stroke({ color: borderColor, width: NODE.BORDER_WIDTH });

    // Updating the progress bar
    this.progressBar.clear();
    if (this.data.status === "installing") {
      const width = Size;
      const height = 4;
      const x = -Size / 2;
      this.progressBar.rect(x, 0, width, height).fill({ color: COLOR.NODE_BG });
      this.progressBar
        .rect(x, 0, width * this.data.installationProgress, height)
        .fill({ color: COLOR.NODE_INSTALLING });
    }
  }
}
