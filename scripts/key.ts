import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { decode, nsecEncode, npubEncode } from "nostr-tools/nip19";

function parseKey(raw: string): Uint8Array {
  if (/^[0-9a-f]{64}$/i.test(raw))
    return Uint8Array.from(Buffer.from(raw, "hex"));
  const decoded = decode(raw);
  if (decoded.type !== "nsec")
    throw new TypeError("expected an nsec or 32-byte hex key");
  return decoded.data as Uint8Array;
}

async function main() {
  if (!input.isTTY)
    throw new Error("private key input requires an interactive terminal");
  const prompt = createInterface({ input, output, terminal: true });
  const choice = await prompt.question(
    "Use existing key or generate new? [existing/generate] ",
  );
  const key =
    choice === "generate"
      ? generateSecretKey()
      : parseKey(await prompt.question("Existing nsec or hex key: "));
  const pubkey = getPublicKey(key);
  console.log(`Allowed public key: ${pubkey}\nnpub: ${npubEncode(pubkey)}`);
  if (choice === "generate")
    console.log(
      `Save and import this once into your NIP-07 extension: ${nsecEncode(key)}`,
    );
  prompt.close();
}
void main();
