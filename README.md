# Urlattice

A configurable personal URL shortener backed by signed Nostr records, with no
hosted link database. A Cloudflare Worker resolves links; a GitHub Pages
creator console signs and publishes them from a NIP-07 browser extension.

## Architecture

```text
NIP-07 extension ── signed event ──> configured Nostr relays
browser ── short URL ──> Cloudflare Worker ── verified lookup ──> redirect
```

The Worker only accepts records signed by the configured public key. It holds
no private key or database binding. The static console has no authenticated API
and never persists private material.

## Configure an instance

## Commands

```sh
npm ci
cp urlattice.config.example.json urlattice.config.json
npm run key
npm run configure -- --config urlattice.config.json
npm run test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

`npm run key` interactively derives an allowed public key from an existing
private key or generates a new key for import into a NIP-07 extension. It never
saves private material.

`npm run configure` generates the Worker and creator-console public
configuration from the ignored local config file.

Commit the generated `wrangler.jsonc` and `apps/creator-web/public/` files for
your instance. They contain only public deployment configuration (your allowed
public key, domains, and relays); the private key remains local.

## Deploy the redirector

Create a Cloudflare API token scoped to the owning account and redirect-domain
zone:

- Account: **Workers Scripts: Edit**
- Zone: **Workers Routes: Edit**

Do not grant DNS edit, KV, D1, R2, Durable Objects, or global API-key access.

```sh
export CLOUDFLARE_API_TOKEN='...'
npm ci
npm run configure -- --config urlattice.config.json
npm run typecheck
npm test
npm run lint
npm run format:check
npx wrangler deploy
```

For the redirect domain, retain the Cloudflare Worker route
`<redirect-domain>/*`. The apex DNS record remains Cloudflare-proxied; it does
not point to GitHub Pages.

## Deploy the creator console

The included GitHub Actions workflow builds and deploys the console on every
push to `main`.

1. Create a DNS-only CNAME for the creator subdomain, such as
   `app.example.com` → `<github-owner>.github.io`.
2. In the repository's **Settings → Pages**, select **GitHub Actions** as the
   publishing source.
3. Set the custom domain to the creator domain and, after GitHub verifies it,
   enable HTTPS.

The generated `apps/creator-web/public/CNAME` is deployed with the site, but
the custom domain must still be configured in GitHub Pages settings.

## Verify and recover

Publish a destination through the static creator console with the configured
NIP-07 extension, then request its displayed short URL:

```sh
curl -i https://<redirect-domain>/<printed-code>
```

Expect `302` and a `Location` header matching the destination. A missing code
returns `404`; a total configured-relay outage returns `503`.

On 2026-07-31, `https://urlattice.xyz/AxzJcmighuPxyK` returned `302 Location:
https://blog.argakiig.xyz/` from the deployed Worker.

The creator console does not store a key. Retain the private key in its NIP-07
extension or local key manager. Losing it does not invalidate published links,
but prevents publishing future records with the same provenance. Never commit
or upload it.

## Repository layout

```text
apps/redirector/       Cloudflare Worker
apps/creator-cli/      local creator command
apps/creator-web/      static NIP-07 creator console
packages/protocol/     signed record contract
packages/relay/        Nostr relay transport
scripts/configure.ts   operator configuration generator
```

## Design records

The protocol and package contracts are in [docs/SPEC.md](docs/SPEC.md) and
[docs/PACKAGE-SPEC.md](docs/PACKAGE-SPEC.md). Architectural decisions remain in
[docs/decisions/](docs/decisions/).
