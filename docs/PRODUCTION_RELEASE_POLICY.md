# Non-bypassable Production Release Policy

This policy applies to the BuddhaChat official site, download page, redirect targets, release
metadata, APK delivery, Vercel configuration, DNS, Tencent COS, and every other change that can alter
what Production users receive.

## Authority

The authenticated BuddhaBloom admin Staging/Release workflow is the sole Production release
authority. Automated tests, Staging health, a READY Vercel deployment, credentials, and chat approval
are necessary context but are not approval records.

An agent must not click the owner's approval controls, call approval or promotion endpoints on the
owner's behalf, or directly mutate Production. The owner records approval in the backend UI.

## Required State Machine

1. Push the exact candidate Git SHA and make it visible to the backend release workflow.
2. Merge that exact candidate head into `staging`; the authenticated BuddhaBloom admin workflow
   deploys the exact final `staging` SHA to the designated Staging environment.
3. Verify Staging and retain fresh evidence for every affected surface.
4. The owner records Staging acceptance; the shared release batch reaches `staging_accepted`.
5. The backend workflow performs `approve_main`; the batch reaches `main_ready`.
6. The backend workflow creates an unaliased Production Candidate; the batch reaches
   `candidate_ready`.
7. The owner verifies that exact candidate and records Production acceptance; the batch reaches
   `production_accepted`.
8. Only the backend `promote_production` action for that batch may move public aliases. The final
   state is `promoted`.

No state may be skipped, inferred, recreated locally, or replaced by a direct provider command.

## Approval Evidence

Before any public Production mutation, the backend record must identify all of the following:

- product: `official`;
- release batch ID;
- exact Git SHA already accepted on Staging;
- Staging deployment ID and verification evidence;
- exact Production Candidate deployment ID;
- owner identity and timestamps for Staging and Production acceptance;
- current batch status: `production_accepted`.

Missing, stale, mismatched, or inaccessible evidence means **stop**. Approval from another release or
another deployment cannot be reused.

## Prohibited Direct Paths

Agents and local automation must never use any of these paths to release:

- `vercel --prod` or `vercel deploy --prod`, including `--skip-domain`;
- `vercel promote` or direct Production alias assignment;
- direct mutation of Production Vercel environment variables;
- direct Production DNS, certificate, Tencent COS ACL, bucket-policy, object, or stable-pointer changes;
- pushing an auto-deploying Production branch as a substitute for the backend workflow;
- calling `/api/releases` approval or `promote_production` actions as if the agent were the owner;
- replaying a previous approval or treating chat language as backend approval.

Provider credentials establish technical capability only. They do not override this policy.

## Agent Stop Point

After Staging evidence or an unaliased candidate is ready, the agent reports the release batch ID,
exact SHA, deployment IDs, checks, and remaining human action. It then stops. The owner continues in
the backend UI. No public Production state may change while waiting.

## Emergency Rollback

An explicit owner request may authorize restoration of a named previously live deployment and its
previous configuration. Rollback must be narrowly scoped, immediately verified, and recorded. It
does not authorize a replacement release or allow the normal approval flow to be skipped afterward.

## Enforcement

`npm run check:release-policy` runs during every build and fails when repository automation contains
direct Vercel Production commands, when Vercel Git auto-deployment is enabled, or when this policy
is removed from the operating contract. This static guard
supplements the backend state machine; it does not replace human approval.
