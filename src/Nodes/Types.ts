export type NodeTypes =
  "router" | "firewall" | "server" | "client" | "crypto" | "ids";

export const NODE_LABELS: Record<NodeTypes, string> = {
  router: "Роутер",
  firewall: "Фаервол",
  server: "Сервер",
  client: "Клиент",
  crypto: "СКЗИ",
  ids: "IDS/IPS",
};

export type NodeStatus = "active" | "installing" | "awaiting_config";

// Nodes
export interface Node {
  id: string;
  type: NodeTypes;
  x: number;
  y: number;
  status: NodeStatus;
  installationProgress: number;
}
// Links
export interface Link {
  id: string;
  fromId: string;
  toId: string;
}

// Factory functions to create nodes and links with unique IDs
let nodeIdCounter = 1;
let linkIdCounter = 1;

export function createNode(type: NodeTypes, x: number, y: number): Node {
  return {
    id: `n${nodeIdCounter++}`,
    type,
    x,
    y,
    status: "installing",
    installationProgress: 0,
  };
}

export function createLink(fromId: string, toId: string): Link {
  return {
    id: `l${linkIdCounter++}`,
    fromId,
    toId,
  };
}
