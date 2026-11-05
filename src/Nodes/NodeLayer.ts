import { Container } from "pixi.js";
import { NodeView } from "./NodeView";
import { createNode, type NodeTypes } from "./Types";

export class NodeLayer {
  readonly display = new Container();
  private nodes = new Map<string, NodeView>();

  // Now using the factory function to create nodes
  add(type: NodeTypes, x: number, y: number): NodeView {
    const data = createNode(type, x, y);
    const view = new NodeView(data);
    this.nodes.set(data.id, view);
    this.display.addChild(view);
    return view;
  }

  remove(id: string): void {
    const view = this.nodes.get(id);
    if (!view) return;
    view.destroy({ children: true });
    this.nodes.delete(id);
  }

  get(id: string): NodeView | undefined {
    return this.nodes.get(id);
  }

  // LinkLayer for managing links between nodes can be added here in the future
  getAll(): NodeView[] {
    return Array.from(this.nodes.values());
  }
  hitTest(x: number, y: number): NodeView | undefined {
    // checking all nodes to see if the click is within their bounds
    for (const view of this.nodes.values()) {
      const dx = x - view.data.x;
      const dy = y - view.data.y;
      // If the click is within the node's bounds
      if (Math.abs(dx) <= 32 && Math.abs(dy) <= 32) {
        return view;
      }
    }
    return undefined;
  }
}
