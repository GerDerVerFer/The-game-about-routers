import { Container } from "pixi.js";
import { NodeView } from "./NodeView";
import type { Node, NodeTypes } from "./Types";

let nextId = 1;

export class NodeLayer {
  readonly display = new Container();
  private nodes = new Map<string, NodeView>();

  add(type: NodeTypes, x: number, y: number): NodeView {
    const data: Node = { id: `n${nextId++}`, type, x, y };
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
}
