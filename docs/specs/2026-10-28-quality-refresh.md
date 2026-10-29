# Compatible maintenance refresh

## Scope

Align root React with the installed RN renderer 19.2.3.
Refresh compatible public JavaScript dependencies and selected Trunk tools, retaining the current RN families and native SDK/plugin pins.
Remove the unsupported release Web job: the Android/iOS example does not declare a Web build script or Web toolchain.
Preserve public module behavior, fork patches, source and native configuration.
Do not change Dependabot configuration or existing bot PRs.

## Acceptance

Regenerate the Yarn lock with the selected Yarn version and verify immutable installation.
Run declared lint, typecheck, Jest, library build, dependency audit and full no-fix Trunk checks.
Pin Pinact 4.1.1 with lint and enabled upgrade.
Exercise the offline scanner reader and real detection controls, retaining scan errors as failures.
Reconcile affected README/CLAUDE/CI claims in this PR.
Request separate repository publication approval after local verification and review.

## Oracle

Personal project identity was verified from the Git origin and wiki frontmatter.
The bounded project query returned no precedent for dependency compatibility or Web build.
Provider source 9670d54de3076c5239713f54900c7a855bd18478 differs from the current wiki 33d0c5e7543e46755205b9b1c35dd6e10bef20aa; freshness is UNVERIFIED/PARTIAL.
Use current installed package metadata and actual repository gates as acceptance evidence.

## Verified boundaries

The declared JavaScript lint, typecheck and library build run independently of the offline reader tests.
The Jest command currently accepts an empty suite; do not report it as a positive test count.
The lock is regenerated without weakening explicit Yarn defaults, and the existing patched qs resolution/checksum must remain unchanged.
CI checks the vendored CLI's path and SHA-512 before its first Yarn invocation; tampered bytes, a wrong path and an unpinned manager must fail local controls.
The dependency audit compares every resolved npm identity with native OSV output, treating synthetic workspace rows separately and rejecting missing, duplicate or extra identities.
Remove obsolete image-size exceptions; retain the explicit no-patch deepmerge risk without claiming non-reachability.
Only proven generated-input secret false positives receive scanner-specific path exceptions; dependency vulnerability scans remain enabled for the Yarn lock.
The Ruby lock is inspected independently; the unsupported CocoaPods lock exception is OSV-only.
No native app, device or advertising integration result is claimed.
