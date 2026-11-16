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
  type: "data" | "malicious" = "data",
): Packet {
  return {
    id: `p${packetIdCounter++}`,
    type,
    path,
    progress: 0,
    currentSegment: 0,
  };
}

// Factory functions to create nodes and links with unique IDs
let nodeIdCounter = 1;

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

export class ClientNode extends BaseNode {
  constructor(x: number, y: number) {
    super("client", x, y);
  }
  public getGeneratedPacketType() {
    return "data" as const;
  }
}

export class ExternalNode extends BaseNode {
  constructor(x: number, y: number) {
    super("external", x, y);
  }
  public getGeneratedPacketType() {
    return Math.random() < 0.5 ? ("malicious" as const) : null;
  }
}

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
