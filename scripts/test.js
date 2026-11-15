#!/usr/bin/env node
// Runs the unit tests in tests/ with Node's own test runner. The app's modules are ES modules written for
// Metro, so they are compiled to CommonJS on the fly with the Babel that Expo already installs: no extra
// dependencies. Only the pure modules (budget, plans, split, format…) can be tested this way; anything that
// imports react-native needs a device. Run: npm test
const fs = require('fs');
const path = require('path');
const Module = require('module');
const babel = require('@babel/core');

const root = path.join(__dirname, '..');
const compile = Module.prototype._compile;
Module.prototype._compile = function (code, filename) {
  const own = filename.startsWith(root) && !filename.includes('node_modules');
  if (!own || !/^\s*(import|export)\s/m.test(code)) return compile.call(this, code, filename);
  const out = babel.transformSync(code, {
    filename,
    babelrc: false,
    configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  return compile.call(this, out.code, filename);
};

const dir = path.join(root, 'tests');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort()) require(path.join(dir, file));
