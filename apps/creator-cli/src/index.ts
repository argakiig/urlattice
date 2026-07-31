import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
} from "nostr-tools/pure";
import {
  canonicalPayload,
  deriveCode,
  normalizeDestination,
} from "../../../packages/protocol/src/record.js";
import { NostrRelayClient } from "../../../packages/relay/src/client.js";

const RELAYS = [
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.nostr.com",
];

async function loadKey(path: string): Promise<Uint8Array> {
  try {
    return Uint8Array.from(
      Buffer.from((await readFile(path, "utf8")).trim(), "hex"),
    );
  } catch {
    const key = generateSecretKey();
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, Buffer.from(key).toString("hex"), { mode: 0o600 });
    return key;
  }
}

async function main(): Promise<void> {
  const destination = process.argv[2];
  if (!destination) throw new Error("usage: urlattice-create <url>");
  const keyPath = join(
    process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
    "urlattice",
    "key",
  );
  const key = await loadKey(keyPath);
  const payload = {
    v: 1 as const,
    url: normalizeDestination(destination),
    nonce: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
      "base64url",
    ),
  };
  const code = await deriveCode(payload, getPublicKey(key));
  const event = finalizeEvent(
    {
      kind: 8003,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["c", code]],
      content: canonicalPayload(payload),
    },
    key,
  );
  const results = await new NostrRelayClient(RELAYS).publish(event);
  if (results.filter((result) => result.status === "accepted").length < 3)
    throw new Error("fewer than three relays accepted the record");
  console.log(`https://urlattice.xyz/${code}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "publish failed");
  process.exitCode = 1;
});
