import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";

import {
  canonicalPayload,
  deriveCode,
  normalizeDestination,
} from "../../../packages/protocol/src/record.js";
import { NostrRelayClient } from "../../../packages/relay/src/client.js";
import { parseConfig } from "../../../scripts/configure.js";
import { parseKey, promptSecret } from "../../../scripts/key.js";

export function assertAuthorizedKey(
  key: Uint8Array,
  allowedPubkey: string,
): string {
  const pubkey = getPublicKey(key);
  if (pubkey !== allowedPubkey)
    throw new Error("signing key is not authorized");
  return pubkey;
}

async function main(): Promise<void> {
  const destination = process.argv[2];
  const configIndex = process.argv.indexOf("--config");
  const configPath =
    configIndex < 0 ? undefined : process.argv[configIndex + 1];
  if (!destination || !configPath)
    throw new Error(
      "usage: npm run create -- <https-url> --config urlattice.config.json",
    );

  const config = parseConfig(JSON.parse(await readFile(configPath, "utf8")));
  const key = parseKey(await promptSecret("Nsec or hex signing key: "));
  const pubkey = assertAuthorizedKey(key, config.allowedPubkey);
  const payload = {
    v: 1 as const,
    url: normalizeDestination(destination),
    nonce: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
      "base64url",
    ),
  };
  const code = await deriveCode(payload, pubkey);
  const event = finalizeEvent(
    {
      kind: 8003,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["c", code]],
      content: canonicalPayload(payload),
    },
    key,
  );
  const results = await new NostrRelayClient(config.relays).publish(event);
  if (results.filter((result) => result.status === "accepted").length < 3)
    throw new Error("fewer than three relays accepted the record");
  console.log(`https://${config.redirectDomain}/${code}`);
}

if (process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`)
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "publish failed");
    process.exitCode = 1;
  });
