import { AppRegistry } from 'react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './src/App';
import { name as appName } from './app.json';

const Root = () =>
  React.createElement(SafeAreaProvider, null, React.createElement(App));

AppRegistry.registerComponent(appName, () => Root);
