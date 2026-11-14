import { Container, Graphics } from "pixi.js";
import { createPacket, type Packet } from "./Types";
import type { NodeLayer } from "./NodeLayer";
import { PACKET } from "../Config";

export class PacketLayer {
  readonly display = new Container();
  private packets = new Map<string, Packet>();
  private views = new Map<string, Graphics>();
  private nodeLayer: NodeLayer;

  // Packet Speed in ppm
  private readonly speed = PACKET.SPEED;

  // Packet arriva callback
  public onPacketArrive?: (packet: Packet) => void;
  public onPacketBlocked?: (packet: Packet) => void;

  constructor(nodeLayer: NodeLayer) {
    this.nodeLayer = nodeLayer;
  }

  spawn(path: string[], type: "data" | "malicious") {
    if (path.length < 2) return;

    const packet = createPacket(path, type);
    this.packets.set(packet.id, packet);

    const view = new Graphics();
    if (type === "malicious") {
      // Malicious
      view.circle(0, 0, 5).fill({ color: PACKET.PACKET_MALICIOUS });
      view.circle(0, 0, 8).stroke({
        color: PACKET.PACKET_MALICIOUS,
        alpha: PACKET.PACKET_ALPHA_MALICIOUS,
        width: PACKET.PACKET_WIDTH,
      });
    } else {
      // Data
      view.circle(0, 0, 5).fill({ color: PACKET.PACKET });
      view.circle(0, 0, 8).stroke({
        color: PACKET.PACKET,
        alpha: PACKET.PACKET_ALPHA,
        width: PACKET.PACKET_WIDTH,
      });
    }

    this.views.set(packet.id, view);
    this.display.addChild(view);
    this.updateViewPosition(packet, view);
  }

  tick(deltaMS: number) {
    for (const [id, packet] of this.packets.entries()) {
      const view = this.views.get(id)!;

      const fromNode = this.nodeLayer.get(packet.path[packet.currentSegment]);
      const toNode = this.nodeLayer.get(packet.path[packet.currentSegment + 1]);

      if (!fromNode || !toNode) {
        // Node was removed, destroy the packet
        view.destroy();
        this.views.delete(id);
        this.packets.delete(id);
        continue;
      }

      // Counting the distance between the two nodes
      const dx = toNode.data.x - fromNode.data.x;
      const dy = toNode.data.y - fromNode.data.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Progress
      packet.progress += (this.speed * deltaMS) / distance;

      if (packet.progress >= 1) {
        // End of segment
        // Firewall check: If the packet is malicious and the next node is a firewall, block it
        if (packet.type === "malicious" && toNode.data.type === "firewall") {
          if (this.onPacketBlocked) this.onPacketBlocked(packet);
          view.destroy();
          this.views.delete(id);
          this.packets.delete(id);
          continue;
        }

        packet.currentSegment++;
        packet.progress = 0;

        // It was last node
        if (packet.currentSegment >= packet.path.length - 1) {
          if (this.onPacketArrive) this.onPacketArrive(packet);
          view.destroy();
          this.views.delete(id);
          this.packets.delete(id);
          continue;
        }
      }

      this.updateViewPosition(packet, view);
    }
  }

  private updateViewPosition(packet: Packet, view: Graphics) {
    const from = this.nodeLayer.get(packet.path[packet.currentSegment])!.data;
    const to = this.nodeLayer.get(packet.path[packet.currentSegment + 1])!.data;

    view.x = from.x + (to.x - from.x) * packet.progress;
    view.y = from.y + (to.y - from.y) * packet.progress;
  }
}
