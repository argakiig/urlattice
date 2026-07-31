export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export type RelayStatus = "accepted" | "rejected" | "timeout" | "error";
export const MAX_EVENTS_PER_RELAY = 32;
const MAX_RELAY_MESSAGE_BYTES = 64 * 1024;

export interface RelayResult {
  url: string;
  status: RelayStatus;
  events?: NostrEvent[];
}

export interface RelayClient {
  publish(event: NostrEvent): Promise<RelayResult[]>;
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

  publish(event: NostrEvent): Promise<RelayResult[]> {
    return Promise.all(this.urls.map((url) => this.publishOne(url, event)));
  }

  queryByCode(code: string): Promise<RelayResult[]> {
    return Promise.all(this.urls.map((url) => this.queryOne(url, code)));
  }

  private publishOne(url: string, event: NostrEvent): Promise<RelayResult> {
    return this.connect(url, (socket, done) => {
      socket.send(JSON.stringify(["EVENT", event]));
      socket.addEventListener("message", ({ data }) => {
        const message = parseRelayMessage(data);
        if (!message) return done("error");
        if (message[0] === "OK") done(message[2] ? "accepted" : "rejected");
      });
    });
  }

  private queryOne(url: string, code: string): Promise<RelayResult> {
    return this.connect(url, (socket, done) => {
      const events: NostrEvent[] = [];
      const subscription = crypto.randomUUID();
      socket.send(
        JSON.stringify(["REQ", subscription, { kinds: [8003], "#c": [code] }]),
      );
      socket.addEventListener("message", ({ data }) => {
        const message = parseRelayMessage(data);
        if (!message) return done("error");
        if (message[0] === "EVENT" && message[1] === subscription) {
          if (events.length === MAX_EVENTS_PER_RELAY) return done("error");
          events.push(message[2] as NostrEvent);
        }
        if (message[0] === "EOSE" && message[1] === subscription)
          done("accepted", events);
      });
    });
  }

  private connect(
    url: string,
    action: (
      socket: WebSocket,
      done: (status: RelayStatus, events?: NostrEvent[]) => void,
    ) => void,
  ): Promise<RelayResult> {
    return new Promise((resolve) => {
      const socket = new WebSocket(url);
      const timer = setTimeout(() => finish("timeout"), this.timeoutMs);
      let finished = false;
      const finish = (status: RelayStatus, events?: NostrEvent[]) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        socket.close();
        resolve({ url, status, events });
      };
      socket.addEventListener("open", () => {
        try {
          action(socket, finish);
        } catch {
          finish("error");
        }
      });
      socket.addEventListener("error", () => finish("error"));
    });
  }
}

function parseRelayMessage(data: unknown): unknown[] | undefined {
  if (typeof data !== "string" || data.length > MAX_RELAY_MESSAGE_BYTES)
    return undefined;
  try {
    const message: unknown = JSON.parse(data);
    return Array.isArray(message) ? message : undefined;
  } catch {
    return undefined;
  }
}
