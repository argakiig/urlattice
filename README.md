# urlattice.xyz

Permanent URL redirects backed by signed Nostr records, with no hosted link database.

## Commands

```sh
npm install
npm run dev
npm run test
npm run typecheck
npm run lint
npm run format:check
```

`npm run dev` starts the local Cloudflare Worker. Deployment and DNS changes are intentionally not part of local development.

## Architecture

The redirector is a stateless Cloudflare Worker for `urlattice.xyz`. It will resolve immutable, signed records from the relay set documented in [ADR-002](docs/decisions/ADR-002.md). It has no database or durable storage binding.
