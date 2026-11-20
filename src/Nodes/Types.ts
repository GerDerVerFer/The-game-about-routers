/* eslint-disable @typescript-eslint/no-unused-vars */
export type NodeTypes =
  "router" | "firewall" | "server" | "client" | "crypto" | "ids" | "external";

export const NODE_LABELS: Record<NodeTypes, string> = {
  router: "Роутер",
  firewall: "Фаервол",
  server: "Сервер",
  client: "Клиент",
  crypto: "СКЗИ",
  ids: "IDS/IPS",
  external: "Интернет",
};

export type NodeStatus =
  "active" | "installing" | "awaiting_config" | "disabled" | "rebooting";

// Packets
export interface Packet {
  id: string;
  type: "data" | "malicious";
  path: string[];
  progress: number;
  currentSegment: number;
  sourceId: string;
  targetId: string;
  isResponse: boolean;
}

// Nodes
export interface Node {
  id: string;
  type: NodeTypes;
  x: number;
  y: number;
  status: NodeStatus;
  installationProgress: number;
  isUsed: boolean;
}
// Links
export interface Link {
  id: string;
  fromId: string;
  toId: string;
}

let linkIdCounter = 1;
let packetIdCounter = 1;

export function createPacket(
  path: string[],
  type: "data" | "malicious",
  sourceId: string,
  targetId: string,
  isResponse: boolean = false,
): Packet {
  return {
    id: `p${packetIdCounter++}`,
    type,
    path,
    progress: 0,
    currentSegment: 0,
    sourceId,
    targetId,
    isResponse,
  };
}

// Factory functions to create nodes and links with unique IDs
let nodeIdCounter = 1;

// Base class for all nodes
export abstract class BaseNode {
  id: string;
  type: NodeTypes;
  x: number;
  y: number;
  status: NodeStatus = "installing";
  installationProgress: number = 0;
  isUsed: boolean = false;

  overloadAccumulator: number = 0; // MS! node were overloaded ticker
  maxOverloadTime: number = 4000; // REboot timer
  rebootDuration: number = 5000; // Rebooting
  rebootTimer: number = 0;

  currentLoad: number = 0;
  maxCapacity: number = 100;

  constructor(type: NodeTypes, x: number, y: number) {
    this.id = `n${nodeIdCounter++}`;
    this.type = type;
    this.x = x;
    this.y = y;
  }

  public getGeneratedPacketType(): "data" | "malicious" | null {
    return null;
  }

  public canPassPacket(_packet: Packet): boolean {
    if (this.status === "rebooting") return false;
    if (this.currentLoad >= this.maxCapacity) return false;
    return true;
  }

  // Ticking on devices
  public tick(deltaMS: number) {
    if (this.status === "rebooting") {
      this.rebootTimer -= deltaMS;
      if (this.rebootTimer <= 0) {
        this.status = "active"; // Rebooted!
        this.currentLoad = 0;
        this.overloadAccumulator = 0;
      }
      return; // Cant heat or cool
    }

    // Cooling
    if (this.currentLoad > 0) {
      this.currentLoad = Math.max(0, this.currentLoad - deltaMS / 400);
    }

    // Heating logic
    if (this.currentLoad >= this.maxCapacity) {
      this.overloadAccumulator += deltaMS;
      if (this.overloadAccumulator >= this.maxOverloadTime) {
        // REbooting
        this.status = "rebooting";
        this.rebootTimer = this.rebootDuration;
        this.currentLoad = 0;
      }
    } else {
      // Cooling
      this.overloadAccumulator = Math.max(
        0,
        this.overloadAccumulator - deltaMS,
      );
    }
  }
}

// Specific node types with their unique behaviors
// Client node generates data packets
export class ClientNode extends BaseNode {
  constructor(x: number, y: number) {
    super("client", x, y);
  }
  public getGeneratedPacketType() {
    return "data" as const;
  }
}

// Server node, can respond to packets and always allows packets to pass
export class ServerNode extends BaseNode {
  constructor(x: number, y: number) {
    super("server", x, y);
    this.maxCapacity = 10;
    this.maxOverloadTime = 10000;
  }
}

// Router node has a maximum capacity for packets and dropspackets if overloaded
export class RouterNode extends BaseNode {
  constructor(x: number, y: number) {
    super("router", x, y);
    this.maxCapacity = 8;
    this.maxOverloadTime = 6000;
  }
}

// Internet node generates malicious packets and always allows packets to pass
export class ExternalNode extends BaseNode {
  constructor(x: number, y: number) {
    super("external", x, y);
  }

  public getGeneratedPacketType() {
    const rand = Math.random();
    if (rand < 0.6) return "data" as const;
    if (rand < 0.9) return "malicious" as const;
    return null;
  }
}

// Firewall node blocks malicious packets if the blockMalicious property is true
export class FirewallNode extends BaseNode {
  blockMalicious: boolean = true;

  constructor(x: number, y: number) {
    super("firewall", x, y);
    this.maxCapacity = 10;
    this.maxOverloadTime = 8000;
  }

  public canPassPacket(packet: Packet): boolean {
    if (!super.canPassPacket(packet)) return false;
    if (packet.type === "malicious" && this.blockMalicious) {
      return false;
    }
    return true;
  }
}

// Dummies (now)
export class StandardNode extends BaseNode {
  constructor(type: NodeTypes, x: number, y: number) {
    super(type, x, y);
  }
}

export function createNode(type: NodeTypes, x: number, y: number): BaseNode {
  switch (type) {
    case "client":
      return new ClientNode(x, y);
    case "external":
      return new ExternalNode(x, y);
    case "firewall":
      return new FirewallNode(x, y);
    case "server":
      return new ServerNode(x, y);
    case "router":
      return new RouterNode(x, y);
    default:
      return new StandardNode(type, x, y);
  }
}

export function createLink(fromId: string, toId: string): Link {
  return {
    id: `l${linkIdCounter++}`,
    fromId,
    toId,
  };
}
