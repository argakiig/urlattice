import type { Event } from "nostr-tools";

export type RelayStatus = "accepted" | "rejected" | "timeout" | "error";

export interface RelayResult {
  url: string;
  status: RelayStatus;
  events?: Event[];
}

export interface RelayClient {
  publish(event: Event): Promise<RelayResult[]>;
  queryByCode(code: string): Promise<RelayResult[]>;
}

export class NostrRelayClient implements RelayClient {
  constructor(
    private readonly urls: readonly string[],
    private readonly timeoutMs = 5_000,
  ) {
    if (urls.length < 3)
      throw new TypeError("at least three relays are required");
  }

  publish(event: Event): Promise<RelayResult[]> {
    return Promise.all(this.urls.map((url) => this.publishOne(url, event)));
  }

  queryByCode(code: string): Promise<RelayResult[]> {
    return Promise.all(this.urls.map((url) => this.queryOne(url, code)));
  }

  private publishOne(url: string, event: Event): Promise<RelayResult> {
    return this.connect(url, (socket, done) => {
      socket.send(JSON.stringify(["EVENT", event]));
      socket.addEventListener("message", ({ data }) => {
        const message = JSON.parse(String(data));
        if (message[0] === "OK") done(message[2] ? "accepted" : "rejected");
      });
    });
  }

  private queryOne(url: string, code: string): Promise<RelayResult> {
    return this.connect(url, (socket, done) => {
      const events: Event[] = [];
      const subscription = crypto.randomUUID();
      socket.send(
        JSON.stringify(["REQ", subscription, { kinds: [8003], "#c": [code] }]),
      );
      socket.addEventListener("message", ({ data }) => {
        const message = JSON.parse(String(data));
        if (message[0] === "EVENT" && message[1] === subscription)
          events.push(message[2]);
        if (message[0] === "EOSE" && message[1] === subscription)
          done("accepted", events);
      });
    });
  }

  private connect(
    url: string,
    action: (
      socket: WebSocket,
      done: (status: RelayStatus, events?: Event[]) => void,
    ) => void,
  ): Promise<RelayResult> {
    return new Promise((resolve) => {
      const socket = new WebSocket(url);
      const timer = setTimeout(() => finish("timeout"), this.timeoutMs);
      const finish = (status: RelayStatus, events?: Event[]) => {
        clearTimeout(timer);
        socket.close();
        resolve({ url, status, events });
      };
      socket.addEventListener("open", () => action(socket, finish));
      socket.addEventListener("error", () => finish("error"));
    });
  }
}
