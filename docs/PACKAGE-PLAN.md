# Plan: configurable personal Urlattice package

## Proposed stack

Use Vite with vanilla TypeScript for the static console. It keeps the UI dependency surface small, produces GitHub Pages assets, and needs no runtime server. This is the only new framework dependency and requires approval with this plan.

## Dependency graph

```text
config + key onboarding -> generated Worker config -> Worker allowlist
                         -> generated web config -> static NIP-07 console -> Pages deploy
```

## Task 1: configuration contract and generator

**Acceptance:** validates two distinct HTTPS domains, one lowercase hex public key, and three-or-more `wss://` relays; generates `wrangler.jsonc`, Pages `CNAME`, and public web config; ignores local config.

**Verify:** config unit tests; generation into a temporary directory; typecheck.

**Files:** config schema/generator, example config, tests, `.gitignore`.  
**Scope:** M

## Task 2: interactive key onboarding

**Acceptance:** derives a public key from a securely prompted existing private key or generates a new pair; never writes private material; requires acknowledgement before displaying a generated export.

**Verify:** deterministic key tests and a manual interactive run.

**Dependencies:** Task 1.  
**Files:** key command, tests, command documentation.  
**Scope:** M

## Task 3: Worker allowlist enforcement

**Acceptance:** only the configured public key can yield a redirect; a valid record from another key returns `404`; current deployed config is regenerated from local config.

**Verify:** resolver integration tests for allowed, denied, absent, outage, and collision cases.

**Dependencies:** Task 1.  
**Files:** redirector resolution/entrypoint, tests, generated Worker config.  
**Scope:** M

## Checkpoint: secure backend

- [ ] Configuration and key onboarding never persist private material.
- [ ] Allowlist tests prove domain-abuse prevention.
- [ ] Existing live redirect remains valid after the approved operator config is applied.

## Task 4: static NIP-07 creator console

**Acceptance:** loads public config, detects a NIP-07 extension, displays the active public key and authorization state, accepts an HTTP(S) destination, signs/publishes through relays, and presents a copyable short URL or a clear error.

**Verify:** browser unit tests plus manual extension signing; keyboard and narrow-screen checks.

**Dependencies:** Tasks 1–3.  
**Files:** Vite app, styles, NIP-07 adapter, tests.  
**Scope:** L, split into foundation and publish-flow commits.

## Task 5: GitHub Pages deployment and security headers

**Acceptance:** build emits deployable static assets and `CNAME`; Pages workflow is documented; generated HTML includes a restrictive CSP and has no private values.

**Verify:** production build; inspect emitted assets; deploy preview/manual Pages verification.

**Dependencies:** Task 4.  
**Files:** Vite config, Pages workflow, generated assets config, operations docs.  
**Scope:** M

## Task 6: package verification and migration guide

**Acceptance:** a clean clone can configure a different domain/key/relay set, deploy both surfaces, publish an allowed link, and demonstrate a denied foreign-key record.

**Verify:** clean-directory rehearsal, full test/typecheck/lint/format/audit, and deployed smoke test.

**Dependencies:** Tasks 1–5.  
**Files:** README, operations docs, migration guide.  
**Scope:** M

## Risks

| Risk                                     | Mitigation                                                           |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Private key leaks through setup          | Prompt only through TTY; never accept an argument or write it.       |
| Static UI enables spam                   | Worker public-key allowlist prevents resolving unauthorized records. |
| GitHub Pages cannot add response headers | Emit a CSP meta policy and keep the UI free of sensitive state.      |
| Generated configuration drifts           | Generator owns all deployment artifacts; tests compare exact output. |
