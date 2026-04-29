module.exports = {
  root: true,
  extends: ['@react-native', 'prettier'],
  ignorePatterns: ['node_modules/', 'lib/'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'prettier/prettier': [
      'error',
      {
        quoteProps: 'consistent',
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        useTabs: false,
      },
    ],
  },
};
