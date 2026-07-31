import { describe, expect, it } from "vitest";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { npubEncode } from "nostr-tools/nip19";

import { parseKey } from "./key.js";

describe("parseKey", () => {
  it("accepts a 32-byte hexadecimal private key", () => {
    expect(parseKey("11".repeat(32))).toHaveLength(32);
  });

  it("rejects a public key where a private key is required", () => {
    expect(() =>
      parseKey(npubEncode(getPublicKey(generateSecretKey()))),
    ).toThrow("expected an nsec");
  });
});
