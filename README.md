# Urlattice

A configurable personal URL shortener backed by signed Nostr records, with no hosted link database.

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

`npm run key` interactively derives an allowed public key from an existing private key or generates a new key for import into a NIP-07 extension. It never saves private material.

`npm run configure` generates the Worker and creator-console public configuration from the ignored local config file.

## Architecture

The redirector is a stateless Cloudflare Worker. It resolves immutable records only when their NIP-01 public key matches `allowedPubkey` from the operator config. The static creator console uses the browser's NIP-07 extension to sign and publish records directly to relays. Neither component stores a private key or has a database binding.

See [package specification](docs/PACKAGE-SPEC.md) and [operations](docs/OPERATIONS.md).
