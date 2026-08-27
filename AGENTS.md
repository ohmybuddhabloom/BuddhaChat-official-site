# BuddhaChat Official Site Operating Contract

This repository publishes the BuddhaChat official website and application download experience.
Keep changes small, preserve existing download channels, and verify user-visible behavior before
promotion.

## Mandatory Staging-First Deployment Policy

Every website, H5, download-page, release-metadata/API, redirect, APK-delivery, Google Play, or
App Store-related change must pass through the designated staging environment before Production.

1. Run the relevant automated tests, lint/static checks, and production build locally.
2. Commit the candidate, push it to the remote repository, and record its exact Git SHA before
   deployment. Deploy that exact SHA to staging; an unpushed working tree, local dev server, or
   preview screenshot is not staging evidence.
3. Verify the complete affected flow on staging using every relevant platform/device and retain
   fresh evidence. Download-flow verification must include displayed version/build, official
   source/domain, redirect target, user prompts, and artifact identity where applicable.
4. Only after staging passes may the same deployment become eligible for the authenticated
   BuddhaBloom admin release workflow. Staging success is evidence, not Production authorization.
   Production authorization exists only when the admin release batch for this exact Git SHA records
   the required human approvals described below.
5. Keep Vercel Git-triggered deployments disabled through `git.deploymentEnabled: false`. Use the
   shared manual exact-SHA release workflow; do not re-enable automatic Preview or Production
   deployment as a shortcut.
6. Treat pushing `main` as a Production action whenever repository configuration is ever changed
   to make `main` auto-deploy. In that setup, do not push `main` before staging succeeds.
7. If staging is unavailable or fails verification, stop the promotion and record the blocker.
   Never bypass staging by substituting local verification or deploying directly to Production.

## Non-bypassable Backend Approval Gate

`NON_BYPASSABLE_PRODUCTION_APPROVAL`

The authenticated BuddhaBloom admin Staging/Release workflow is the only authority allowed to move
this repository toward Production. This is a fail-closed rule, not a recommendation.

1. An agent may prepare code, push the exact candidate SHA, deploy or verify Staging through the
   backend workflow, and report evidence. The agent must stop at the next human approval gate.
2. The owner must personally record Staging acceptance and Production Candidate acceptance in the
   admin UI. A chat message such as "开始", "继续", "可以", "回到任务", or "上线" is not a backend
   approval record and must never be interpreted as permission to mutate Production.
3. The release batch must match product `official`, the exact Git SHA, and the exact Staging and
   Production Candidate deployment IDs. Before Production is eligible, the shared batch must have
   reached `production_accepted` through the authenticated admin UI.
4. Production promotion is performed only by the backend `promote_production` action triggered from
   that approved batch. Agents must not call that endpoint, simulate the owner click, reuse an old
   approval, or create an approval record on the owner's behalf.
5. The following direct paths are prohibited even when credentials are available and even when all
   automated checks pass: `vercel --prod`, `vercel deploy --prod` (including `--skip-domain`),
   `vercel promote`, Production alias changes, Production environment-variable mutations, Production
   DNS/COS ACL changes, and changes to a stable Production APK object or pointer.
6. Possession of Vercel, GoDaddy, Tencent Cloud, GitHub, Supabase, or other Production credentials is
   capability only; it is never authorization.
7. If the backend workflow is unavailable, stale, missing the candidate, or lacks a current approval
   record, stop. Do not substitute CLI, API, dashboard automation, local checks, or verbal approval.
8. The only exception is an explicit owner request to roll back an already-live change. Rollback
   authority permits only restoration of the named prior state and never authorizes a new release.

The canonical state machine, evidence requirements, and prohibited-command list are maintained in
`docs/PRODUCTION_RELEASE_POLICY.md` and enforced by `npm run check:release-policy` during every build.

## Production Safety

- Do not change or replace the published APK while testing a website-only download experience.
- Preserve WeChat external-browser handoff, Google Play access, App Store access, and immutable APK
  URLs unless the task explicitly changes them.
- After Production promotion, verify the live public route and confirm it serves the same candidate
  that passed staging.
- Never perform Production verification by first making an unapproved Production change. Candidate
  verification must use the backend-created, unaliased Production Candidate and stop for the owner's
  recorded backend approval before any public alias moves.
