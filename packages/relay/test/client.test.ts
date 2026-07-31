import { describe, expect, it } from "vitest";

import { NostrRelayClient } from "../src/client.js";

describe("NostrRelayClient", () => {
  it("requires three relays for replicated publication", () => {
    expect(
      () => new NostrRelayClient(["wss://one.example", "wss://two.example"]),
    ).toThrow("at least three relays");
  });
});
