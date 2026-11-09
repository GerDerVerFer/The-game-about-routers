import { Container } from "pixi.js";
import { NodeView } from "./NodeView";
import { createNode, type NodeTypes } from "./Types";
import { INSTALL_TIME, NODE } from "../Config";

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

  // Removing a node by its ID
  remove(id: string): void {
    const view = this.nodes.get(id);
    if (!view) return;
    view.destroy({ children: true });
    this.nodes.delete(id);
  }

  // Getting a node by its ID
  get(id: string): NodeView | undefined {
    return this.nodes.get(id);
  }

  // LinkLayer for managing links between nodes can be added here in the future
  getAll(): NodeView[] {
    return Array.from(this.nodes.values());
  }

  // Ticking function for progress updates
  tick(deltaMS: number) {
    for (const view of this.nodes.values()) {
      if (view.data.status === "installing") {
        // Node installation time
        const timeRequired = INSTALL_TIME[view.data.type] || 3000;

        // Updating installation progress based on deltaMS
        view.data.installationProgress += deltaMS / timeRequired;

        if (view.data.installationProgress >= 1) {
          view.data.installationProgress = 1;
          view.data.status = "awaiting_config"; // END
        }
        //REdrawing
        view.updateVisuals();
      }
    }
  }

  // Function to check if a point (x, y) is within any node's bounds
  hitTest(x: number, y: number): NodeView | undefined {
    // checking all nodes to see if the click is within their bounds
    for (const view of this.nodes.values()) {
      const dx = x - view.data.x;
      const dy = y - view.data.y;
      // If the click is within the node's bounds
      if (Math.abs(dx) <= NODE.SIZE / 2 && Math.abs(dy) <= NODE.SIZE / 2) {
        return view;
      }
    }
    return undefined;
  }
}
