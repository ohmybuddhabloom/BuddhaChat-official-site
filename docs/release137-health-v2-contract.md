# Release137 official health control-plane compatibility

Reproduced: the exact Stage 8b1ac8c public GET returns HTTP200 with
`admin_settings:v1`. Canonical admin Stage 8fea82b `runDeploymentSmoke` rejects
that real response as `deployment_health_dependencies_missing`. Captured response
and validator replay live in integration artifacts/release137-release-health-20261004.

Must change: report `release_batches:v2` only with a successful authenticated,
read-only probe of the real release_batches store. Probe failure must remain503.
Must preserve: exact SHA, environment and expected-Supabase checks, deterministic
public config checksum, secret-free diagnostics, GET-only and no-store response,
and all onboarding/download/master/auth routes. No Owner approval is created.

Ownership: server-only api/_lib/release-health.js and its existing behavior tests.
No mobile caller, UI bundle, credentials, release state or deployment is changed.
Verification: pre-fix red new v2 behavior test; focused and full tests, lint/build;
actual canonical backend validator consumes the fixed health result locally.
Stage deployment and fresh backend gate readback remain required; formal iOS and
Android candidates/flows remain release blockers and are not inferred from tests.
