# ADR-003: Use StyleSheet.flatten Before Passing Styles to the Native Bridge

**Status:** Accepted  
**Date:** 2026-05-01

## Context

`NativeAdViewComponents.tsx` exposes sub-components (`TitleView`, `BodyView`, `CallToActionView`, `IconView`) that extract individual style properties and pass them as discrete native props to the underlying `DaroMNativeAdView` via `setNativeProps`. This is necessary because the native layer expects individual style attributes (e.g., `fontSize`, `color`) rather than a React Native `StyleProp`.

The original implementation cast the incoming `StyleProp<TextStyle>` directly to `TextStyle` using `as`:

```ts
const styleObj = style as TextStyle;
const fontSize = styleObj.fontSize as number;
```

`StyleProp<T>` is defined as `T | T[] | false | null | undefined | RegisteredStyle<T>`. A `RegisteredStyle<T>` is a numeric ID returned by `StyleSheet.create()` — React Native's recommended way to define styles. An array style (`[styles.title, { color: 'red' }]`) is also valid and common.

Casting a numeric ID or an array directly to `TextStyle` results in all property accesses returning `undefined`. The extracted props are still spread into `setNativeProps`, so no error is thrown — styles are silently not applied. This is the worst class of bug: invisible, no warning, and only reproducible when the consumer uses the idiomatic `StyleSheet.create()` pattern.

## Decision

Use `StyleSheet.flatten` to resolve the style value before accessing individual properties:

```ts
const styleObj: TextStyle = StyleSheet.flatten(style) ?? {};
```

`StyleSheet.flatten` handles all valid `StyleProp` variants:

- `null` / `undefined` / `false` → returns `undefined` (defaulting to `{}`)
- `RegisteredStyle<T>` (numeric ID) → resolves to the registered style object
- `T[]` (array) → merges into a single flat object (later items win)
- Plain `T` → returned as-is

The same fix applies to `useImageStyleProps` which had the identical pattern for `StyleProp<ImageStyle>`.

## Consequences

- Consumers using `StyleSheet.create()` (the React Native recommended pattern) will now have their styles correctly applied to native ad sub-components.
- Array style composition (e.g., `[globalStyles.text, localOverride]`) works correctly.
- No API changes; the fix is internal to the hooks.
