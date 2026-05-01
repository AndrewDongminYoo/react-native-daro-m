# ADR-004: Use Primitive `string` Not Wrapper Object `String` in Public APIs

**Status:** Accepted
**Date:** 2026-05-01

## Context

`src/index.tsx` and `src/types/DaroMMobileAds.ts` declared the `userId` parameter of `setUserId` as `String` (capital S).

In TypeScript, `String` and `string` are distinct types:

|                                | `string`                     | `String`                                |
| ------------------------------ | ---------------------------- | --------------------------------------- |
| What it is                     | Primitive type               | JavaScript `String` wrapper object type |
| Created by                     | `"hello"`, template literals | `new String("hello")`                   |
| TypeScript recommendation      | ✅ Always use                | ❌ Almost never use                     |
| `@typescript-eslint/ban-types` | Allowed                      | Flagged as error                        |

String literals and variables declared with `string` are **not assignable to `String`** in strict TypeScript. A consumer calling `setUserId(someStringVariable)` could receive a type error in strict mode even though the function works perfectly at runtime, because `string` is not a structural subtype of `String`.

There is no scenario in this library where the JavaScript `String` wrapper object is the intended type.

## Decision

Replace `String` with `string` in:

- `setUserId(userId: string)` in `src/index.tsx`
- `setUserId: (userId: string) => Promise<void>` in `src/types/DaroMMobileAds.ts`

## Consequences

- The public API type is accurate and passes `@typescript-eslint/ban-types` without suppression.
- Consumers in strict TypeScript projects no longer risk spurious type errors when passing ordinary string values.
- No runtime behavior changes.
