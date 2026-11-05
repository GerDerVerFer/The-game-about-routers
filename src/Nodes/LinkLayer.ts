import { Container, Graphics } from "pixi.js";
import { createLink, type Link } from "./Types";
import type { NodeLayer } from "./NodeLayer";

export class LinkLayer {
  readonly display = new Container();
  private links = new Map<string, Link>();
  private graphics = new Graphics();
  private nodeLayer: NodeLayer;

  // Initialize the LinkLayer with a reference to the NodeLayer for node position lookups
  constructor(nodeLayer: NodeLayer) {
    this.nodeLayer = nodeLayer;
    this.display.addChild(this.graphics);
  }

  add(fromId: string, toId: string) {
    // Check if a link already exists between the two nodes to prevent duplicates
    const exists = Array.from(this.links.values()).some(
      (l) =>
        (l.fromId === fromId && l.toId === toId) ||
        (l.fromId === toId && l.toId === fromId),
    );
    if (exists) return;

    // Create a new link and add it to the map
    const link = createLink(fromId, toId);
    this.links.set(link.id, link);
    this.redraw();
  }

  // Redraw the links on the graphics layer based on the current node positions
  redraw() {
    this.graphics.clear();

    for (const link of this.links.values()) {
      const fromNode = this.nodeLayer.get(link.fromId);
      const toNode = this.nodeLayer.get(link.toId);

      // Only draw the link if both nodes exist
      if (fromNode && toNode) {
        this.graphics
          .moveTo(fromNode.data.x, fromNode.data.y)
          .lineTo(toNode.data.x, toNode.data.y)
          .stroke({ color: 0x636973, width: 4 });
      }
    }
  }
}
