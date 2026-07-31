import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { resolve } from "node:path";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { decode, nsecEncode, npubEncode } from "nostr-tools/nip19";

export function parseKey(raw: string): Uint8Array {
  if (/^[0-9a-f]{64}$/i.test(raw))
    return Uint8Array.from(Buffer.from(raw, "hex"));
  const decoded = decode(raw);
  if (decoded.type !== "nsec")
    throw new TypeError("expected an nsec or 32-byte hex key");
  return decoded.data as Uint8Array;
}

export async function promptSecret(message: string): Promise<string> {
  if (!input.isTTY)
    throw new Error("private key input requires an interactive terminal");
  output.write(message);
  input.setRawMode(true);
  input.resume();
  return new Promise((resolveSecret, reject) => {
    let value = "";
    const finish = () => {
      input.off("data", onData);
      input.setRawMode(false);
      output.write("\n");
      resolveSecret(value);
    };
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          input.off("data", onData);
          input.setRawMode(false);
          reject(new Error("key input cancelled"));
          return;
        }
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f") value = value.slice(0, -1);
        else value += character;
      }
    };
    input.on("data", onData);
  });
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
      : parseKey(await promptSecret("Existing nsec or hex key: "));
  const pubkey = getPublicKey(key);
  console.log(`Allowed public key: ${pubkey}\nnpub: ${npubEncode(pubkey)}`);
  if (choice === "generate") {
    const confirmation = await prompt.question(
      "Type reveal to display the one-time private-key export: ",
    );
    if (confirmation !== "reveal")
      throw new Error("private key export was not revealed");
    console.log(
      `Save and import this once into your NIP-07 extension: ${nsecEncode(key)}`,
    );
  }
  prompt.close();
}
if (process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`)
  void main();
