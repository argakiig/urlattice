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
const embedded = window.top !== window.self;

if (embedded) {
  status.textContent = "For your security, Urlattice cannot run in a frame.";
  button.disabled = true;
} else {
  void initializePublisher();
}

async function initializePublisher() {
  const config = await fetch("/config.json").then(
    (r) =>
      r.json() as Promise<{
        publisherContractVersion: 1;
        eventKind: 8003;
        recordTag: "c";
        allowedPubkey: string;
        relays: string[];
        redirectDomain: string;
      }>,
  );
  if (config.publisherContractVersion !== 1 || config.eventKind !== 8003 || config.recordTag !== "c") throw new Error("Unsupported publisher contract.");
  status.textContent = "Select Publish to connect your Nostr extension.";
  button.onclick = async () => {
    try {
      if (!window.nostr) {
        throw new Error("missing-extension");
      }

      const activePubkey = await window.nostr.getPublicKey();
      if (activePubkey !== config.allowedPubkey) {
        throw new Error("unauthorized-key");
      }

      button.disabled = true;
      status.textContent = "Approve the signed record in your extension…";
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
      const event = await window.nostr.signEvent({
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
    } catch (error) {
      if (error instanceof Error && error.message === "missing-extension") {
        status.textContent =
          "Install or unlock a NIP-07 extension, then try again.";
      } else if (
        error instanceof Error &&
        error.message === "unauthorized-key"
      ) {
        status.textContent =
          "The connected Nostr key is not authorized for this site.";
      } else {
        status.textContent = "Publishing failed; no short URL was created.";
      }
    } finally {
      button.disabled = false;
    }
  };
}
