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
  "active" | "installing" | "awaiting_config" | "disabled";

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
    return true;
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
  }
  public canPassPacket(_packet: Packet): boolean {
    return true;
  }
}

// Router node has a maximum capacity for packets and dropspackets if overloaded
export class RouterNode extends BaseNode {
  maxCapacity: number = 4;
  currentLoad: number = 0;

  constructor(x: number, y: number) {
    super("router", x, y);
  }
  public canPassPacket(_packet: Packet): boolean {
    return this.currentLoad < this.maxCapacity;
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
  }

  public canPassPacket(packet: Packet): boolean {
    if (packet.type === "malicious" && this.blockMalicious) {
      return false;
    }
    return true;
  }
}

// Остальные ноды (Роутер, Сервер, СКЗИ, IDS) - просто заглушки
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
