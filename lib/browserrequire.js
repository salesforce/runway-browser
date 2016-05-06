/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

'use strict';

let babel = require('babel-standalone');
let Input = require('runway-compiler/lib/input.js');
let jQuery = require('jquery');

// Compiled into bundle.js and exported to code loaded in the browser at runtime
let builtinModules = {
  // external dependencies
  'deprecated!react': require('react'),
  'deprecated!react-dom': require('react-dom'),
  'colorbrewer': require('colorbrewer'),
  'd3': require('d3'),
  'jquery': require('jquery'),
  'lodash': require('lodash'),

  // runway-compiler files
  'runway-compiler/lib/changesets.js': require('runway-compiler/lib/changesets.js'),

  // runway-browser files
  'runway-browser/lib/menu.js': require('./menu.js'),
  'runway-browser/lib/statedump.jsx': require('./statedump.jsx'),
  'runway-browser/lib/stackedevents.js': require('./stackedevents.js'),
  'runway-browser/lib/tooltip.js': require('./tooltip.js'),
  'runway-browser/lib/util.js': require('./util.js'),
};

let fetchRemoteFile;
let fetchRemoteJS;
let fetchRemoteJSX;

let makeBrowserRequire = function(context) {
  return function(module) {
    if (module in builtinModules) {
      return builtinModules[module];
    }
    if (module.startsWith('./')) {
      if (context === undefined) {
        throw Error(`Need context for require('${module}')`);
      }
      let path = context + module.slice(2);
      console.log(`Fetching ${path}`);
      if (module.endsWith('.js')) {
        return fetchRemoteJS(path);
      } else if (module.endsWith('.jsx')) {
        return fetchRemoteJSX(path);
      } else {
        return fetchRemoteFile(path);
      }
    }
    throw Error(`Unknown module: ${module}`);
  };
};

fetchRemoteFile = (filename) => new Promise((resolve, reject) => {
  jQuery.ajax(filename, {
    dataType: 'text',
  }).done(text => {
    resolve(new Input(filename, text));
  }).fail((req, st, err) => {
    reject(err);
  });
});

fetchRemoteJS = (filename) => fetchRemoteFile(filename).then((input) => {
  let load = new Function('module', 'require', input.getText());
  let module = {};
  load(module, makeBrowserRequire());
  return module.exports;
});

fetchRemoteJSX = (filename) => fetchRemoteFile(filename).then((input) => {
  let code = babel.transform(input.getText(), {
    presets: ['react'],
  }).code;
  let load = new Function('module', 'require', code);
  let module = {};
  let path = filename.slice(0, filename.lastIndexOf('/') + 1);
  load(module, makeBrowserRequire(path));
  return module.exports;
});

module.exports = makeBrowserRequire;
