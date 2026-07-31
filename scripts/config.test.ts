import { describe, expect, it } from "vitest";
import { parseConfig } from "./configure.js";
import { npubEncode } from "nostr-tools/nip19";

describe("parseConfig", () => {
  it("accepts three relays", () =>
    expect(
      parseConfig({
        redirectDomain: "go.example.com",
        creatorDomain: "app.example.com",
        allowedPubkey: "a".repeat(64),
        relays: [
          "wss://one.example",
          "wss://two.example",
          "wss://three.example",
        ],
      }).redirectDomain,
    ).toBe("go.example.com"));
  it("accepts an npub", () =>
    expect(
      parseConfig({
        redirectDomain: "go.example.com",
        creatorDomain: "app.example.com",
        allowedPubkey: npubEncode("a".repeat(64)),
        relays: [
          "wss://one.example",
          "wss://two.example",
          "wss://three.example",
        ],
      }).allowedPubkey,
    ).toBe("a".repeat(64)));
});
