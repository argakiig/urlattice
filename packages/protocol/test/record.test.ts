import { describe, expect, it } from "vitest";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";

import {
  deriveCode,
  normalizeDestination,
  validateRecordEvent,
} from "../src/record.js";

const pubkey = "00".repeat(32);
const payload = {
  v: 1,
  url: "https://example.com/docs",
  nonce: "AAAAAAAAAAAAAAAAAAAAAA",
} as const;

describe("record contract", () => {
  it("normalizes an HTTP(S) destination", () => {
    expect(normalizeDestination("HTTPS://EXAMPLE.COM/docs")).toBe(
      "https://example.com/docs",
    );
    expect(() => normalizeDestination("javascript:alert(1)")).toThrow();
  });

  it("derives a stable 14-character Base58 code", async () => {
    await expect(deriveCode(payload, pubkey)).resolves.toMatch(
      /^[1-9A-HJ-NP-Za-km-z]{14}$/,
    );
  });

  it("accepts a signed event with its derived code", async () => {
    const secretKey = new Uint8Array(32).fill(1);
    const code = await deriveCode(payload, getPublicKey(secretKey));
    const event = finalizeEvent(
      {
        kind: 8003,
        created_at: 0,
        tags: [["c", code]],
        content: JSON.stringify(payload),
      },
      secretKey,
    );

    await expect(validateRecordEvent(event)).resolves.toEqual({
      valid: true,
      payload,
      code,
    });
  });

  it("rejects an event before signature verification when its payload is non-canonical", async () => {
    const event = {
      id: "00".repeat(32),
      pubkey,
      created_at: 0,
      kind: 8003,
      tags: [["c", "11111111111111"]],
      content:
        '{"url":"https://example.com/docs","v":1,"nonce":"AAAAAAAAAAAAAAAAAAAAAA"}',
      sig: "00".repeat(64),
    };

    await expect(validateRecordEvent(event)).resolves.toEqual({
      valid: false,
      reason: "content",
    });
  });
});
