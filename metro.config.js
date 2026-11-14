const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Anthropic SDK's ES-module build has modules that import each other in a circle, and Metro evaluates
// them in an order where one is read before it exists ("Cannot read property 'BetaToolRunner' of undefined").
// Its CommonJS build loads in the right order, so the app is pointed at that one.
const ANTHROPIC_CJS = path.join(__dirname, 'node_modules/@anthropic-ai/sdk/index.js');
config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === '@anthropic-ai/sdk'
    ? { type: 'sourceFile', filePath: ANTHROPIC_CJS }
    : context.resolveRequest(context, moduleName, platform);

module.exports = config;
