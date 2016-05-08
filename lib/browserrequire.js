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

let loadRemote;

let githubURL = module => {
  let m = module.match('^github.com/(.*)$');
  if (m === null) {
    return null;
  }
  let components = m[1].split('/');
  if (components.length < 2) {
    return null;
  }
  if (components[components.length - 1] === '') {
    components.pop();
  }
  if (components.length == 2) {
    components.push('master');
  }
  let out = `https://raw.githubusercontent.com/${components.join('/')}/`;
  return out;
};

let makeBrowserRequire = function(context) {
  let browserRequire = function(module) {
    if (module in builtinModules) {
      return builtinModules[module];
    }
    if (module.startsWith('./')) {
      if (context === undefined) {
        throw Error(`Need context for require('${module}')`);
      }
      let path = context + module.slice(2);
      return loadRemote(path);
    }
    if (module.startsWith('http://') || module.startsWith('https://')) {
      return loadRemote(module);
    }
    let github = githubURL(module);
    if (github !== null) {
      return loadRemote(github);
    }
    throw Error(`Unknown module: ${module}`);
  };

  browserRequire.cd = function(path) {
    if (!path.endsWith('/')) {
      path += '/';
    }
    if (path.startsWith('./')) {
      if (context === undefined) {
        throw Error(`Need context for require.cd('${path}')`);
      }
      return makeBrowserRequire(context + path.slice(2));
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return makeBrowserRequire(path);
    }
    let github = githubURL(path);
    if (github !== null) {
      return makeBrowserRequire(github);
    }
    return makeBrowserRequire(context + path);
  };

  browserRequire.remote = function(module) {
    if (module.startsWith('http://') || module.startsWith('https://')) {
      return loadRemote(module);
    }
    if (module.startsWith('./')) {
      let path = context + module.slice(2);
      return loadRemote(path);
    }
    let github = githubURL(module);
    if (github !== null) {
      return loadRemote(github);
    }
    return loadRemote(context + module);
  };

  return browserRequire;
};

let fetchRemoteFile = (filename) => new Promise((resolve, reject) => {
  jQuery.ajax(filename, {
    dataType: 'text',
  }).done(text => {
    resolve(new Input(filename, text));
  }).fail((req, st, err) => {
    reject(err);
  });
});

let loadJS = input => {
  let load = new Function('module', 'require', input.getText());
  let module = {};
  load(module, makeBrowserRequire());
  return module.exports;
};

let loadJSX = input => {
  let code = babel.transform(input.getText(), {
    presets: ['react'],
  }).code;
  let load = new Function('module', 'require', code);
  let module = {};
  let path = input.filename.slice(0, input.filename.lastIndexOf('/') + 1);
  load(module, makeBrowserRequire(path));
  return module.exports;
};

let loadJSON = input => {
  return JSON.parse(input.getText());
};

loadRemote = path => {
  console.log(`Fetching ${path}`);
  return fetchRemoteFile(path).then(input => {
    if (path.endsWith('.js')) {
      return loadJS(input);
    } else if (path.endsWith('.jsx')) {
      return loadJSX(input);
    } else if (path.endsWith('.json')) {
      return loadJSON(input);
    } else {
      return input;
    }
  });
};


module.exports = makeBrowserRequire;
