import { Container, Graphics } from "pixi.js";
import { createPacket, type Packet } from "./Types";
import type { NodeLayer } from "./NodeLayer";
import { COLOR, PACKET } from "../Config";

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
  public onServerReceiveRequest?: (packet: Packet) => void;

  constructor(nodeLayer: NodeLayer) {
    this.nodeLayer = nodeLayer;
  }

  spawn(
    path: string[],
    type: "data" | "malicious",
    sourceId: string,
    targetId: string,
    isResponse: boolean = false,
  ) {
    if (path.length < 2) return;

    const packet = createPacket(path, type, sourceId, targetId, isResponse);
    this.packets.set(packet.id, packet);

    const view = new Graphics();
    const color = isResponse
      ? COLOR.PACKET_RESPONCE
      : type === "malicious"
        ? COLOR.PACKET_MALICIOUS
        : COLOR.PACKET;

    view.circle(0, 0, 5).fill({ color });
    view.circle(0, 0, 8).stroke({ color, alpha: 0.3, width: 2 });

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
        view.destroy();
        this.views.delete(id);
        this.packets.delete(id);
        continue;
      }

      const dx = toNode.data.x - fromNode.data.x;
      const dy = toNode.data.y - fromNode.data.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      packet.progress += (this.speed * deltaMS) / distance;

      if (packet.progress >= 1) {
        // Incrementing BEFORE check
        toNode.data.currentLoad += 1;

        if (!toNode.data.canPassPacket(packet)) {
          if (this.onPacketBlocked) this.onPacketBlocked(packet);
          view.destroy();
          this.views.delete(id);
          this.packets.delete(id);
          continue;
        }

        // Request
        if (toNode.data.type === "server" && !packet.isResponse) {
          if (this.onServerReceiveRequest) this.onServerReceiveRequest(packet);

          // Its a virus
          if (packet.type === "malicious" && this.onPacketArrive) {
            this.onPacketArrive(packet);
          }

          view.destroy();
          this.views.delete(id);
          this.packets.delete(id);
          continue;
        }

        // next step
        packet.currentSegment++;
        packet.progress = 0;

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
