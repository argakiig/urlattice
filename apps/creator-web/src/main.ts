/* eslint-disable @typescript-eslint/no-unused-expressions */
import "@fontsource/lexend/latin-400.css";
import "@fontsource/lexend/latin-500.css";
import "@fontsource/lexend/latin-600.css";
import "@fontsource/lexend/latin-700.css";
import "./style.css";

import {
  canonicalPayload,
  deriveCode,
  normalizeDestination,
} from "../../../packages/protocol/src/record.js";

export {};

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(
        event: Record<string, unknown>,
      ): Promise<Record<string, unknown>>;
    };
  }
}
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const button = document.querySelector<HTMLButtonElement>("#publish")!;
const input = document.querySelector<HTMLInputElement>("#url")!;
const config = await fetch("/config.json").then(
  (r) =>
    r.json() as Promise<{
      allowedPubkey: string;
      relays: string[];
      redirectDomain: string;
    }>,
);
if (
  !window.nostr ||
  (await window.nostr.getPublicKey()) !== config.allowedPubkey
) {
  status.textContent = "Connect the authorized NIP-07 key to publish.";
  button.disabled = true;
} else {
  status.textContent = "Authorized key connected.";
  button.onclick = async () => {
    try {
      const nonce = btoa(
        String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
      )
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
      const payload = {
        v: 1 as const,
        url: normalizeDestination(input.value),
        nonce,
      };
      const code = await deriveCode(payload, config.allowedPubkey);
      const event = await window.nostr!.signEvent({
        kind: 8003,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["c", code]],
        content: canonicalPayload(payload),
      });
      await Promise.all(
        config.relays.map(
          (url) =>
            new Promise<void>((resolve, reject) => {
              const ws = new WebSocket(url);
              ws.onopen = () => ws.send(JSON.stringify(["EVENT", event]));
              ws.onmessage = ({ data }) => {
                const m = JSON.parse(data as string);
                ws.close();
                m[0] === "OK" && m[2]
                  ? resolve()
                  : reject(new Error("rejected"));
              };
              ws.onerror = () => reject(new Error("unavailable"));
            }),
        ),
      );
      status.textContent = `Published: https://${config.redirectDomain}/${code}`;
    } catch {
      status.textContent = "Publishing failed; no short URL was created.";
    }
  };
}
