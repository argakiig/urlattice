# Operations

## Deploy

Create a Cloudflare API token scoped to the owning account and `urlattice.xyz` zone:

- Account: Workers Scripts Edit
- Zone: Workers Routes Edit

Do not grant a global API key, KV, D1, R2, Durable Objects, or DNS edit permissions.

```sh
export CLOUDFLARE_API_TOKEN='...'
npm ci
npm run typecheck
npm test
npm run lint
npm run format:check
npx wrangler deploy
```

## Smoke test

Publish a destination, then request its printed URL:

```sh
npm run create -- https://example.com
curl -i https://urlattice.xyz/<printed-code>
```

Expect `302` and a `Location` header matching the destination. The Worker must return `404` for a missing code and `503` when every configured relay is unavailable.

## Recovery limits

The creator key is stored locally at `$XDG_CONFIG_HOME/urlattice/key` (or `~/.config/urlattice/key`). Back it up securely: losing it does not invalidate published links, but loses provenance for future records. Never commit or upload it.
