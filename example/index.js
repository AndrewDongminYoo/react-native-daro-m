import { AppRegistry } from 'react-native';
import React from 'react';
import App from './src/App';
import { name as appName } from './app.json';

const Root = () => React.createElement(App);

AppRegistry.registerComponent(appName, () => Root);
