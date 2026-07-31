# Spec: configurable personal Urlattice package

## Status

Accepted. This supersedes the single-instance deployment assumptions.

## Objective

Let an operator clone the repository, provide domains, their allowed Nostr public key, and relay URLs once, then deploy a personal distributed URL shortener: a Cloudflare Worker redirector plus a GitHub Pages creator console. No database, hosted control plane, or server-held signing key is used.

## Operator configuration

The committed `urlattice.config.example.json` documents this shape:

```json
{
  "redirectDomain": "go.example.com",
  "creatorDomain": "app.example.com",
  "allowedPubkey": "64-char-lowercase-hex-key",
  "relays": [
    "wss://relay-one.example",
    "wss://relay-two.example",
    "wss://relay-three.example"
  ]
}
```

`urlattice.config.json` is local-only and ignored by Git. A configuration command validates it, emits Worker configuration, the GitHub Pages `CNAME`, and the frontend public configuration. The public key and relay URLs are intentionally public; private keys and Cloudflare tokens are never configuration values.

## Key onboarding

Before configuration, the operator chooses exactly one local-only path:

- **Use an existing key:** provide an `nsec` or 32-byte hex private key to an interactive command; it derives and displays the public key for the config without persisting the supplied private key.
- **Generate a key:** the command generates a Nostr keypair, displays the one-time private-key export, and requires the operator to save/import it into their NIP-07 extension before continuing.

The setup command never accepts a private key in a command-line argument or config file. It derives `allowedPubkey`; the private key remains in the operator's extension (or another explicitly chosen local key manager).

## Security model

- The creator console uses NIP-07; the extension owns and approves use of the private key.
- The Worker validates NIP-01 signatures and resolves only events whose public key equals `allowedPubkey`.
- Anyone may load or copy the static console, but cannot create resolving links without the allowed key.
- The console ships a restrictive CSP and makes no authenticated API request.
- The Worker config grants no storage binding. Cloudflare deployment requires only Workers Scripts Edit and Workers Routes Edit for the operator's account/zone.

## Commands

```sh
npm ci
cp urlattice.config.example.json urlattice.config.json
npm run key -- --interactive
npm run configure -- --config urlattice.config.json
npm run typecheck
npm test
npm run build
npm run deploy:worker
npm run deploy:pages
```

The last two commands require the operator's Cloudflare and GitHub authentication respectively; neither is run by configuration.

## Project structure

```text
apps/redirector/       Cloudflare Worker
apps/creator-web/      static NIP-07 console
scripts/configure.ts   validates config and generates deployment artifacts
urlattice.config.*     operator configuration contract
```

## Testing strategy

- Unit tests: config validation, generated artifacts, allowlist enforcement, and NIP-07 adapter errors.
- Integration tests: Worker responses for allowed and non-allowed signed records.
- Manual proof: extension signs a record; deployed creator URL publishes it; redirect domain returns `302`.

## Boundaries

- Always: validate config, require exactly one allowed public key in v1, retain three-or-more relays, generate rather than hand-edit deployment artifacts, and keep private-key onboarding interactive and local-only.
- Ask first: multi-user support, remote key custody, analytics, storage, custom relay operation, or a frontend framework dependency.
- Never: commit operator config, signing keys, or Cloudflare/GitHub tokens; allow unapproved public keys to resolve.

## Success criteria

- Changing only the local config produces deployable artifacts for another operator's two domains.
- A record from the configured key redirects; a correctly signed record from another key returns `404`.
- The console works with a NIP-07 extension and never persists a private key.
- Setup can derive the allowed public key from an existing key or generate a new key without writing either private key to configuration or source control.
- The redirector and console can be deployed independently after a clone.

## Open questions

- The chosen frontend framework and build tooling require approval in the implementation plan.
