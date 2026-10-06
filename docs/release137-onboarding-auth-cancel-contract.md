# Release 1.3.7 onboarding auth cancellation contract

## Must change

- Embedded H5 onboarding must treat a native `auth.sign_in` error with `code:
  "auth_cancelled"` as an intentional provider dismissal.
- The welcome screen stays visible, the current native action is unlocked, and
  the retry action is cleared.
- Cancellation must not show the bridge error banner, must not persist
  onboarding progress, and must not run the sign-in success handoff.

## Must preserve

- Real native auth failures still show the existing localized retry banner and
  keep the retry action available.
- `auth_cancelled` from non-auth events is not silently swallowed.
- Unknown or legacy cancellation strings are not silently swallowed unless the
  native bridge sends the typed `auth_cancelled` code for `auth.sign_in`.
- Successful sign-in still persists `quests` only after the native auth ACK.

## Verification plan

- Add behavior-level Vitest coverage for typed quiet cancellation.
- Add protection cases for genuine auth failure and for a non-auth event that
  reports `auth_cancelled`.
- Runtime Release verification on Android and iOS remains pending in the parent
  release candidate flow; this H5 task prepares source and tests only.

## Independent-review protection case

- Cancellation classification applies only to the initial native authentication request.
- After its successful ACK, a failing onboarding persistence callback must still show
  the existing error and retain retry, even when that failure carries `auth_cancelled`.
- Verify the regression fails on commit 15bc84c before the correction, then passes
  alongside all existing welcome tests. No navigation, persistence payload or native
  success behavior changes; Android and iOS exact Release checks remain pending.
