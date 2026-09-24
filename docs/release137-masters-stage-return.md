# Masters Stage return-to-app contract

Must change: only the canonical HTTPS Stage public reader must open buddhachat-staging, preserving exact content ID and home fallback. Must preserve: production links, feature flag, private-route rejection, all reviewed Masters content and player behavior. Scope: public reader CTA and its existing share-link helper/type declaration; no content snapshot replacement.

Regression: test current helper before patch, then exact-origin mapping, production/lookalike/default behavior and private-route protection. Both Android Chromium and iOS WebKit artifact dialog tests are required before hosted Stage handoff; native70/22 direct links are existing partial evidence only. Full site lint/tests/build, exact SHA and hosted deployment verification remain required. No production deployment.

## Local candidate verification

2026-09-24: npm test passed230Vitest cases plus4Masters checks; npm run lint passed; VERCEL_ENV=preview VERCEL_GIT_COMMIT_REF=staging npm run build passed. Public artifact AndroidChromium2/2 and iOSWebKit2/2 passed via canonical-origin proxy, exact content scheme/href and dismiss-to-same-article. First combined browser run had two Android missing-executable failures because WebKit uses a separate cache; Android rerun with its existing default cache passed. This is local built-artifact evidence, not real hosted OS handoff. Logs /Users/chris/CodexArtifacts/official137-masters-{tests,lint,build,browser,browser-android}.log.

Git fetch failed with emptyreply then boundedlow-speedtimeout. Base6e5480873aabb7c70b254e58321d8a225b20d1c2 is a cachedref; sync/rebase as necessary before push/staging integration. No hosted deployment or Production mutation.
