import rnConfig from '@react-native/eslint-config/flat';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  rnConfig,
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
]);
