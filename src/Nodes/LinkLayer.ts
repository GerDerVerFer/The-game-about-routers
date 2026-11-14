import { Container, Graphics } from "pixi.js";
import { createLink, type Link } from "./Types";
import type { NodeLayer } from "./NodeLayer";
import { COLOR, NODE } from "../Config";

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
  remove(id: string) {
    if (this.links.has(id)) {
      this.links.delete(id);
      this.redraw();
    }
  }
  removeByNode(nodeId: string) {
    let changed = false;
    for (const [id, link] of this.links.entries()) {
      if (link.fromId === nodeId || link.toId === nodeId) {
        this.links.delete(id);
        changed = true;
      }
    }
    if (changed) this.redraw();
  }
  hitTest(x: number, y: number): string | undefined {
    const clickRadius = 10;
    for (const [id, link] of this.links.entries()) {
      const fromNode = this.nodeLayer.get(link.fromId);
      const toNode = this.nodeLayer.get(link.toId);
      if (!fromNode || !toNode) continue;

      const x1 = fromNode.data.x,
        y1 = fromNode.data.y;
      const x2 = toNode.data.x,
        y2 = toNode.data.y;

      // Formula for distance from point to line segment
      const A = x - x1;
      const B = y - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;

      let xx, yy;
      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      const dx = x - xx;
      const dy = y - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < clickRadius) return id;
    }
    return undefined;
  }

  // Method to check if a client node is connected to any server node through links
  findPathToServer(startNodeId: string): string[] | null {
    const visited = new Set<string>();
    // saving current node and the path taken to reach it
    const queue: { nodeId: string; path: string[] }[] = [
      { nodeId: startNodeId, path: [startNodeId] },
    ];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = this.nodeLayer.get(nodeId);

      // Server node found, return the path
      if (node && node.data.type === "server" && nodeId !== startNodeId) {
        return path;
      }

      // Searching neighboring nodes connected by links
      for (const link of this.links.values()) {
        let nextNodeId: string | null = null;
        if (link.fromId === nodeId) nextNodeId = link.toId;
        else if (link.toId === nodeId) nextNodeId = link.fromId;

        if (nextNodeId && !visited.has(nextNodeId)) {
          const nextNode = this.nodeLayer.get(nextNodeId);
          // Packets can only traverse through active nodes
          if (nextNode && nextNode.data.status === "active") {
            queue.push({ nodeId: nextNodeId, path: [...path, nextNodeId] });
          }
        }
      }
    }
    return null; // No way!
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
          .stroke({ color: COLOR.LINK_LINE, width: NODE.LINK_WIDTH });
      }
    }
  }
}
