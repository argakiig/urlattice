import { describe, expect, it } from "vitest";
import { parseConfig } from "./configure.js";

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
});
