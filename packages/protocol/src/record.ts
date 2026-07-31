export const RECORD_KIND = 8003;
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const NONCE_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const PUBKEY_PATTERN = /^[0-9a-f]{64}$/;

export interface RecordPayload {
  v: 1;
  url: string;
  nonce: string;
}

export type ValidationResult =
  | { valid: true; payload: RecordPayload; code: string }
  | { valid: false; reason: "content" | "event" | "signature" | "code" };

export function normalizeDestination(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("destination must use HTTP or HTTPS");
  }
  return url.toString();
}

export function canonicalPayload(payload: RecordPayload): string {
  return JSON.stringify({
    v: payload.v,
    url: payload.url,
    nonce: payload.nonce,
  });
}

export async function deriveCode(
  payload: RecordPayload,
  pubkey: string,
): Promise<string> {
  if (!PUBKEY_PATTERN.test(pubkey)) throw new TypeError("invalid public key");
  assertPayload(payload);
  const bytes = new TextEncoder().encode(
    JSON.stringify({ ...payload, pubkey }),
  );
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  let value = 0n;
  for (const byte of digest.slice(0, 10)) value = (value << 8n) | BigInt(byte);
  let code = "";
  do {
    code = BASE58[Number(value % 58n)] + code;
    value /= 58n;
  } while (value > 0n);
  return code.padStart(14, "1");
}

export async function validateRecordEvent(
  event: unknown,
): Promise<ValidationResult> {
  if (
    !isEvent(event) ||
    event.kind !== RECORD_KIND ||
    !PUBKEY_PATTERN.test(event.pubkey)
  ) {
    return { valid: false, reason: "event" };
  }
  let payload: RecordPayload;
  try {
    payload = JSON.parse(event.content) as RecordPayload;
    assertPayload(payload);
    if (event.content !== canonicalPayload(payload)) throw new TypeError();
  } catch {
    return { valid: false, reason: "content" };
  }
  if (!verifyEvent(event)) return { valid: false, reason: "signature" };
  const codeTag = event.tags.find((tag) => tag.length === 2 && tag[0] === "c");
  if (!codeTag) return { valid: false, reason: "code" };
  const code = await deriveCode(payload, event.pubkey);
  if (codeTag[1] !== code) return { valid: false, reason: "code" };
  return { valid: true, payload, code };
}

function assertPayload(payload: RecordPayload): void {
  if (
    Object.keys(payload).join(",") !== "v,url,nonce" ||
    payload.v !== 1 ||
    payload.url !== normalizeDestination(payload.url) ||
    !NONCE_PATTERN.test(payload.nonce)
  ) {
    throw new TypeError("invalid record payload");
  }
}

function isEvent(value: unknown): value is {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
} {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    typeof event.pubkey === "string" &&
    typeof event.created_at === "number" &&
    typeof event.kind === "number" &&
    Array.isArray(event.tags) &&
    event.tags.every(
      (tag) =>
        Array.isArray(tag) && tag.every((part) => typeof part === "string"),
    ) &&
    typeof event.content === "string" &&
    typeof event.sig === "string"
  );
}
import { verifyEvent } from "nostr-tools/pure";
