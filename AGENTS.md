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
4. Only after staging passes may the same deployment be promoted to Production. If the release
   tooling cannot promote the deployment directly, Production must be created from the same exact
   Git SHA and configuration that passed staging. Production still requires current authorization.
5. Keep Vercel Git-triggered deployments disabled through `git.deploymentEnabled: false`. Use the
   shared manual exact-SHA release workflow; do not re-enable automatic Preview or Production
   deployment as a shortcut.
6. Treat pushing `main` as a Production action whenever repository configuration is ever changed
   to make `main` auto-deploy. In that setup, do not push `main` before staging succeeds.
7. If staging is unavailable or fails verification, stop the promotion and record the blocker.
   Never bypass staging by substituting local verification or deploying directly to Production.

## Production Safety

- Do not change or replace the published APK while testing a website-only download experience.
- Preserve WeChat external-browser handoff, Google Play access, App Store access, and immutable APK
  URLs unless the task explicitly changes them.
- After Production promotion, verify the live public route and confirm it serves the same candidate
  that passed staging.
