import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MAX_EVENTS_PER_RELAY, NostrRelayClient } from "../src/client.js";

class FakeWebSocket {
  static sockets: FakeWebSocket[] = [];
  private readonly listeners = new Map<string, Array<(event: Event) => void>>();
  readonly sent: string[] = [];

  constructor(url: string) {
    void url;
    FakeWebSocket.sockets.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  send(message: string) {
    this.sent.push(message);
  }
  close() {}

  emit(type: string, data?: string) {
    for (const listener of this.listeners.get(type) ?? [])
      listener({ data } as MessageEvent<string>);
  }
}

const relayUrls = [
  "wss://one.example",
  "wss://two.example",
  "wss://three.example",
];
let originalWebSocket: typeof WebSocket;

beforeEach(() => {
  originalWebSocket = globalThis.WebSocket;
  FakeWebSocket.sockets = [];
  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
});

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
});

describe("NostrRelayClient", () => {
  it("requires three relays for replicated publication", () => {
    expect(
      () => new NostrRelayClient(["wss://one.example", "wss://two.example"]),
    ).toThrow("at least three relays");
  });

  it("classifies malformed relay messages as errors", async () => {
    const query = new NostrRelayClient(relayUrls).queryByCode("abc");
    for (const socket of FakeWebSocket.sockets) {
      socket.emit("open");
      socket.emit("message", "not json");
    }

    await expect(query).resolves.toEqual(
      relayUrls.map((url) => ({ url, status: "error" })),
    );
  });

  it("rejects relay event floods before retaining them", async () => {
    const query = new NostrRelayClient(relayUrls).queryByCode("abc");
    for (const socket of FakeWebSocket.sockets) {
      socket.emit("open");
      const subscription = JSON.parse(socket.sent[0])[1];
      for (let index = 0; index <= MAX_EVENTS_PER_RELAY; index++)
        socket.emit("message", JSON.stringify(["EVENT", subscription, {}]));
    }

    await expect(query).resolves.toEqual(
      relayUrls.map((url) => ({ url, status: "error" })),
    );
  });
});
