export type NodeTypes =
  "router" | "firewall" | "server" | "client" | "crypto" | "ids";

export const NODE_LABELS: Record<NodeTypes, string> = {
  router: "Router",
  firewall: "Firewall",
  server: "Server",
  client: "Client",
  crypto: "Crypto",
  ids: "IDS/IPS",
};

export interface Node {
  id: string;
  type: NodeTypes;
  x: number;
  y: number;
}
