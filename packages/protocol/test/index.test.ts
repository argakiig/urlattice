import { describe, expect, it } from "vitest";

import { PROTOCOL_VERSION } from "../src/index.js";

describe("protocol package", () => {
  it("exports the v1 protocol version without Worker runtime globals", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});
