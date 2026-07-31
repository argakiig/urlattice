# Implementation Plan: distributed permanent URL shortener (v1)

## Status

Approved. Phase 0 is complete; execute the remaining tasks in order.

## Overview

Deliver one complete path: a local creator signs and publishes an immutable record to three Nostr relays; a stateless handler discovers, verifies, and redirects from that record. No component owns a link database or a creator private key.

## Proposed shape

```text
packages/protocol     record creation and verification
packages/relay        NIP-01 publish/query interface
apps/creator-cli      local key and publish workflow
apps/redirector       stateless edge HTTP handler
```

Use TypeScript throughout. The CLI is the v1 creator interface: it avoids public write endpoints and remote key custody. Exact runtime and dependency versions are intentionally deferred to Task 0.

## Dependency graph

```text
runtime + relay choice -> workspace -> protocol -> relay adapter -> redirector
                                                   \-> creator CLI -> deployed smoke test
```

## Phase 0: required product and deployment decisions

### Task 0: select runtime, domain, and relay set

**Description:** Choose the stateless edge provider and redirect domain; probe three candidate public relays.

**Acceptance criteria:**

- [ ] A provider and domain are named.
- [ ] Three `wss://` relays accept kind `8003` events and answer `#c` queries.
- [ ] The provider supports outbound WebSocket connections from the request handler.

**Verification:** Run a throwaway signed publish/query probe against all three relays; approve the resulting provider and endpoint list.

**Dependencies:** None  
**Files likely touched:** `README.md`, deployment configuration, `.dev.vars.example`  
**Estimated scope:** M

## Phase 1: contract foundation

### Task 1: bootstrap the workspace

**Description:** Add the selected runtime's strict TypeScript workspace, test runner, lint/format configuration, and documented commands.

**Acceptance criteria:**

- [ ] `typecheck`, `test`, `lint`, and local-development commands run.
- [ ] A protocol module imports from a test without edge/runtime globals.
- [ ] No database, KV, or creator key configuration exists.

**Verification:** Run every documented command.

**Dependencies:** Task 0  
**Files likely touched:** `package.json`, lockfile, `tsconfig.json`, test/lint config, `README.md`  
**Estimated scope:** M

### Task 2: implement the record contract

**Description:** Implement canonical serialization, HTTP(S)-only URL normalization, nonce generation, 80-bit Base58 code derivation, and NIP-01 validation.

**Acceptance criteria:**

- [ ] Valid input yields the specified signed kind-8003 record and code.
- [ ] Altered signatures, extra/non-canonical fields, malformed nonces, unsupported schemes, and wrong codes are rejected.
- [ ] A deterministic test vector pins serialization and code output.

**Verification:** Run focused protocol tests, typecheck, and lint.

**Dependencies:** Task 1  
**Files likely touched:** `packages/protocol/src/record.ts`, `packages/protocol/src/encoding.ts`, `packages/protocol/test/record.test.ts`, `packages/protocol/test/vectors.ts`  
**Estimated scope:** M

### Checkpoint: protocol contract

- [ ] Test vectors and rejection tests pass.
- [ ] Public record API matches `docs/SPEC.md`.
- [ ] Human reviews the public record API before network code.

## Phase 2: publish and resolve

### Task 3: add relay adapter and local test doubles

**Description:** Define `publish(event)` and `queryByCode(code)`, then implement NIP-01 WebSocket behavior including `OK`, `EOSE`, timeout, and concurrent relay outcomes.

**Acceptance criteria:**

- [ ] Publish succeeds only after three acknowledgements.
- [ ] Query distinguishes empty results from total outage.
- [ ] One bad relay cannot make a returned event trusted.

**Verification:** Run tests against local WebSocket doubles; manually publish/query a record against the approved relays.

**Dependencies:** Task 2  
**Files likely touched:** `packages/relay/src/client.ts`, `packages/relay/src/types.ts`, `packages/relay/test/client.test.ts`, `packages/relay/test/fake-relay.ts`  
**Estimated scope:** M

### Task 4: implement stateless redirector

**Description:** Add `GET /:code`; concurrently query relays and validate returned events with the protocol package.

**Acceptance criteria:**

- [ ] One valid record produces `302` and the exact validated `Location`.
- [ ] No result is `404`, total outage is `503`, and distinct valid collision is `409`.
- [ ] Invalid events never redirect; configuration contains relay URLs only.

**Verification:** Run handler tests with injected relay doubles; follow a local short URL.

**Dependencies:** Task 3  
**Files likely touched:** `apps/redirector/src/index.ts`, `apps/redirector/src/resolve.ts`, `apps/redirector/test/index.test.ts`, `.dev.vars.example`  
**Estimated scope:** M

### Task 5: implement local creator CLI

**Description:** Create/import a local signing key and publish a destination. Print the short URL only after three relay acknowledgements; never log or upload private key material.

**Acceptance criteria:**

- [ ] `create <url>` publishes and prints a short URL after three acknowledgements.
- [ ] Invalid input or insufficient acknowledgements prints no usable link.
- [ ] Key storage is local-only and ignored by Git.

**Verification:** Run CLI tests; manually complete CLI publish → local redirector → destination.

**Dependencies:** Tasks 3–4  
**Files likely touched:** `apps/creator-cli/src/index.ts`, `apps/creator-cli/src/key-store.ts`, `apps/creator-cli/test/index.test.ts`, `.gitignore`  
**Estimated scope:** M

### Checkpoint: end-to-end

- [ ] A link remains resolvable after redirector restart.
- [ ] Handler has no durable local state; key is not logged or committed.
- [ ] Typecheck, lint, and all tests pass.

## Phase 3: deployment proof

### Task 6: deployment config and operator guide

**Description:** Add selected-provider config plus an operator guide covering relay endpoints, domain binding, key recovery limits, and a smoke test.

**Acceptance criteria:**

- [ ] Deployment has no database/KV binding.
- [ ] A clean machine can reproduce publish and redirect verification.
- [ ] Deployed handler safely returns `503` for total relay outage.

**Verification:** Run provider dry-run/validation; complete a deployed publish → redirect smoke test.

**Dependencies:** Task 5  
**Files likely touched:** provider config, `README.md`, `docs/OPERATIONS.md`, smoke-test script  
**Estimated scope:** M

## Risks

| Risk | Mitigation |
|---|---|
| Relays prune or reject events | Validate and publish to at least three actual relays. |
| Runtime lacks outbound WebSockets | Prove it before bootstrap in Task 0. |
| Public creation attracts abuse | Begin with a local CLI and no create endpoint. |
| Collision | Derive 80-bit codes and fail closed with `409`. |
| Redirect domain outage | Document that records survive but browser links do not. |

## Non-goals

Browser creator UI, accounts, custom aliases, analytics, edit/delete, custom relays, remote key storage, and any claim of permanent availability.
