declare global {
  interface Window {
    nostr?: { getPublicKey(): Promise<string> };
  }
}
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const config = await fetch("/config.json").then(
  (r) => r.json() as Promise<{ allowedPubkey: string }>,
);
if (window.nostr)
  status.textContent =
    (await window.nostr.getPublicKey()) === config.allowedPubkey
      ? "Authorized key connected."
      : "This key is not authorized.";
