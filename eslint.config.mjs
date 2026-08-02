import { fixupConfigRules } from '@eslint/compat';
import rnConfig from '@react-native/eslint-config/flat';
import * as espree from 'espree';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';

// eslint-plugin-react-native@5.0.0 (latest, unmaintained since 2024-12, peers
// eslint ^9) loads its rules via context.getSourceCode(), removed in ESLint 10,
// so every rule it provides is unusable. @react-native/eslint-config enables
// exactly one of them (react-native/no-inline-styles), so drop the plugin
// instead of carrying a dead override. '@react-native/*' rules come from
// @react-native/eslint-plugin, a different package — those stay.
const dropReactNativePlugin = ({ plugins, rules, ...block }) => {
  if (plugins) {
    const { 'react-native': _dropped, ...kept } = plugins;
    block.plugins = kept;
  }
  if (rules) {
    block.rules = Object.fromEntries(
      Object.entries(rules).filter(
        ([name]) => !name.startsWith('react-native/')
      )
    );
  }
  return block;
};

export default defineConfig([
  // fixupConfigRules shims legacy context methods (getSourceCode(),
  // getFilename()) that ESLint 10 removed. Several rules pulled in by
  // @react-native/eslint-config still call them directly:
  // eslint-plugin-eslint-comments's no-aggregating-enable crashes with
  // "context.getSourceCode is not a function", and eslint-plugin-react's
  // detectReactVersion() crashes with "contextOrFilename.getFilename is
  // not a function". Re-check when those plugins ship native ESLint 10
  // support and this wrapper can be dropped.
  // These components are written as `const X = forwardRef(function X(...))`.
  // The named function expression is what gives the component its React
  // DevTools displayName, so it deliberately matches the const it is assigned
  // to. Allow-listed by name rather than renaming the source, which is synced
  // from upstream (see upstream-watch.yml). The override is merged into the
  // block that already declares @typescript-eslint: flat config resolves a
  // rule's plugin from the same config object, and declaring the plugin a
  // second time fails with "Cannot redefine plugin".
  ...fixupConfigRules(rnConfig)
    .map(dropReactNativePlugin)
    .map((block) =>
      block.plugins?.['@typescript-eslint']
        ? {
            ...block,
            rules: {
              ...block.rules,
              '@typescript-eslint/no-shadow': [
                'error',
                { allow: ['AdBannerView', 'NativeAdView', 'NativeAdViewImpl'] },
              ],
            },
          }
        : block
    ),
  prettierRecommended,
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    // Build output. Same set `yarn clean` deletes — Gradle in particular writes
    // JS into its test reports, which lands as hundreds of lint errors the
    // moment anyone runs the Android unit tests.
    ignores: [
      '.yarn/',
      'eslint.config.mjs',
      'node_modules/',
      'lib/',
      'android/build/',
      'example/android/build/',
      'example/android/app/build/',
      'example/ios/build/',
    ],
  },
  {
    // @react-native/eslint-config routes plain .js/.jsx files through
    // @babel/eslint-parser@7 (for Flow), whose eslint-scope@5 lacks
    // addGlobals(), which ESLint 10 requires: "TypeError:
    // scopeManager.addGlobals is not a function". @babel/eslint-parser@8
    // fixes this but needs @babel/core ^8 (still fresh, breaks Metro/Jest's
    // babel 7 toolchain), so fall back to ESLint's default parser instead.
    // None of this repo's .js files use Flow syntax (root config files
    // only). Re-check when @babel/eslint-parser ships eslint-scope@10
    // support on the @babel/core 7 line.
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: espree,
    },
  },
  {
    // Keep LAST so it wins the settings merge over @react-native's config.
    settings: {
      react: {
        // Pin the React version so eslint-plugin-react skips auto-detection.
        // detectReactVersion() calls context.getFilename(), removed in ESLint 10.
        version: '19.2',
      },
    },
  },
]);
