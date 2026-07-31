# Spec: distributed permanent URL shortener (v1)

## Status

Accepted. Implementation must remain within this contract.

## Objective

Provide ordinary browser short links without operating a database. A creator publishes an immutable, signed mapping to multiple independent relays. A stateless redirect service resolves and verifies that mapping before redirecting the visitor.

Success is a link that remains resolvable after the creator's device is gone, provided at least one configured relay and the redirect domain remain reachable.

## Decisions and assumptions to review

- Public creation: no accounts or server-side authorization in v1.
- Each creator holds a local Nostr-compatible secp256k1/Schnorr signing key; the key is proof of authorship, not an account.
- Records replicate to public Nostr relays. The initial deployment configures a small, explicit relay set rather than operating one.
- Redirects use HTTP `302`. Positive caching is permitted as an optimization but is never authoritative.
- Links are permanent: no edit, delete, expiry, analytics, abuse workflow, or destination history.

## Record protocol

### Nostr event

Each link is a signed [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) event with:

```json
{
  "kind": 8003,
  "tags": [["c", "4fr7zYhCHuQpQe"]],
  "content": "{\"v\":1,\"url\":\"https://example.com/docs\",\"nonce\":\"...\"}"
}
```

- `kind` `8003` is a regular, application-specific event kind. NIP-01 reserves `10000` through `19999` for replaceable events, so that range must not be used for permanent records.
- `content` is UTF-8 canonical JSON with exactly `v`, `url`, and `nonce`, in that order and without insignificant whitespace.
- `v` is integer `1`.
- `url` is the WHATWG-serialized absolute destination URL, restricted to `http:` and `https:`.
- `nonce` is 16 cryptographically random bytes encoded as unpadded base64url.
- The event uses normal Nostr event signing; `pubkey`, `id`, and `sig` are supplied and validated according to NIP-01.

### Code derivation and collision rule

The creator derives the code before publishing:

```text
digest = SHA-256(UTF8(canonical-json({v, url, nonce, pubkey})))
code = left-pad-base58(unsigned(digest[0..10]), 14)
```

`digest[0..10]` means the first ten bytes (80 bits). The `c` tag must exactly equal `code`. This makes arbitrary code selection infeasible and gives an accidental-collision probability small enough for v1.

The redirector queries the `c` tag across all configured relays. It accepts a record only when the Nostr signature, strict content shape, URL scheme, and derived code all validate. If two distinct valid records have the same code, it fails closed with `409 Conflict`; it never chooses by relay order or timestamp. NIP-01 specifies that single-letter tags are indexed and queryable as `#<tag>`, which makes `c` the lookup index.

## Publish and resolve flows

1. A creator generates a nonce, normalizes the destination URL, derives the code, signs the event, and waits for acceptance from at least three configured relays.
2. The creator shares `https://<redirect-domain>/<code>`.
3. On a request, the redirector concurrently requests events of kind `8003` tagged `#c=<code>` from its configured relay set.
4. It validates all returned candidates and issues `302 Location: <url>` only for one unique valid mapping.
5. No valid mapping returns `404`. If every relay times out or is unreachable, return `503` with no redirect. Malformed, unsigned, or mismatched records are ignored.

The redirector may cache a verified positive lookup with a bounded TTL. The cache is disposable and never used to manufacture, update, or select a record.

## Architecture boundary

```text
creator (local key) --signed event--> independent Nostr relays
browser --> redirect domain --> stateless resolver --> relays
browser <-- 302 Location <---------- verified record
```

The redirect domain is an availability dependency. It is not the data owner: it holds no link database and can be replaced by another resolver that implements this protocol and uses the same relay set.

## Commands

No runtime exists in this phase. Documentation verification:

```sh
git diff --check
```

## Project structure

```text
docs/SPEC.md              protocol and product boundary
docs/decisions/ADR-001.md decision rationale for relay-backed storage
```

Implementation structure and its build/test commands are deliberately deferred to the planning gate.

## Code style

Protocol payloads are canonical JSON, not loosely interpreted objects:

```json
{"v":1,"url":"https://example.com/docs","nonce":"base64url-without-padding"}
```

Implementations must reject extra fields, non-canonical serializations, unsupported schemes, and code mismatches rather than attempting recovery.

## Testing strategy

The implementation plan must include test vectors for code derivation, valid Nostr signatures, altered content/signatures, malformed records, duplicate-code conflicts, relay timeout classification, and redirect headers. It must also include an integration test with three relay endpoints or test doubles.

## Boundaries

- Always: validate before redirecting; publish to at least three relays; treat caches as non-authoritative; keep private keys local.
- Ask first: add accounts, persistence, analytics, a custom relay, a new destination scheme, or a dependency that owns routing state.
- Never: persist link mappings in a hosted database; silently resolve collisions; redirect to non-HTTP(S) URLs; expose a creator private key.

## Success criteria

- A v1-compliant resolver reaches the same destination from a record published by another compliant creator.
- It rejects a record with an invalid signature, invalid code derivation, extra content field, or unsupported URL scheme.
- A link mapping cannot be edited through the protocol after publication.
- Resolver state can be discarded and reconstructed entirely from configured relays.
- The only required central service is the redirect domain's stateless request handler.

## Open questions for the planning gate

- Which redirect domain and edge runtime will be operated?
- Which initial relay set meets the availability and relay-policy requirements?
- Is public, unauthenticated link creation acceptable for the first user-facing creator interface, or should publishing initially be a local CLI only?
