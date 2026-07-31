# Operations

## Deploy

Create a Cloudflare API token scoped to the owning account and the configured redirect-domain zone:

- Account: Workers Scripts Edit
- Zone: Workers Routes Edit

Do not grant a global API key, KV, D1, R2, Durable Objects, or DNS edit permissions.

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

## Smoke test

Publish a destination through the static creator console using the configured NIP-07 extension, then request its printed URL.

```sh
curl -i https://<redirect-domain>/<printed-code>
```

Expect `302` and a `Location` header matching the destination. The Worker must return `404` for a missing code and `503` when every configured relay is unavailable.

## Deployment evidence

On 2026-07-31, `https://urlattice.xyz/AxzJcmighuPxyK` returned `302 Location: https://blog.argakiig.xyz/` from the deployed Cloudflare Worker.

## Recovery limits

The creator console does not store a key. The operator must retain the private key in their NIP-07 extension or selected local key manager. Losing it does not invalidate published links, but loses provenance for future records. Never commit or upload it.
