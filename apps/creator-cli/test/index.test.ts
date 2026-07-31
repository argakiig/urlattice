import { describe, expect, it } from "vitest";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";

import { assertAuthorizedKey } from "../src/index.js";

describe("assertAuthorizedKey", () => {
  it("rejects a signer that is not the configured publisher", () => {
    expect(() =>
      assertAuthorizedKey(generateSecretKey(), "0".repeat(64)),
    ).toThrow("not authorized");
  });

  it("accepts the configured publisher", () => {
    const key = generateSecretKey();
    expect(assertAuthorizedKey(key, getPublicKey(key))).toBe(getPublicKey(key));
  });
});
