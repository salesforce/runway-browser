"use strict";

let jQuery = require('./node_modules/jquery/dist/jquery.js');
window.jQuery = jQuery;

require('bootstrap-webpack');
let BootstrapMenu = require('bootstrap-menu');

let compiler = require('./compiler.js');
window.compiler = compiler;
let simulator = require('./simulator.js');
let GlobalEnvironment = require('./environment.js').GlobalEnvironment;
let Input = require('./input.js');

let preludeText = require('./prelude.model');

let queryString = require('querystring');

let React = require('react');
let ReactDOM = require('react-dom');

let babel = require('babel-standalone');

let prelude = compiler.loadPrelude(preludeText);

let meval = (text) => {
  let env = new GlobalEnvironment(prelude.env);
  let module = compiler.load(new Input('eval', text), env);
  module.ast.execute();
};
window.meval = meval;

let fetchRemoteFile = (filename) => new Promise((resolve, reject) => {
    jQuery.ajax(filename, {
      dataType: 'text',
    }).then((text) => {
      resolve(new Input(filename, text));
    });
  });

let fetchRemoteModule = function(filename) {
  return fetchRemoteFile(filename)
    .then((input) => {
      let load = eval(`(function load(module) { ${input.getText()} })`);
      let module = {};
      load(module);
      return module.exports;
    });
};

let fetchRemoteJSX = function(filename) {
  return fetchRemoteFile(filename)
    .then((input) => {
      let code = babel.transform(input.getText(), {
        presets: ['react'],
      }).code;
      let load = eval(`(function load(module, React, ReactDOM) { ${code} })`);
      let module = {};
      load(module, React, ReactDOM);
      return module.exports;
    });
};

// Fill an HTML element with a visual representation of a model value.
let toHTML = function(value, outer) {
  let helper = function(value, outer, horizontal, depth) {
    let $ = jQuery;
    let colors = [ // from colorbrewer2.org
      //'#8c510a',
      '#d8b365',
      '#f6e8c3',
      '#f5f5f5',
      '#c7eae5',
      '#5ab4ac',
      '#01665e',
    ];
    let color = colors[depth % colors.length];
    let style = table => table
        .css('border', '1px solid black')
        .css('padding', '5px')
        .css('background', color);
    if (value instanceof Array) {
      let table = style($('<table></table>'));
      if (horizontal) {
        let row = $('<tr></tr>');
        value.forEach(v => row
            .append(helper(v, $('<td></td>'), false, depth + 1)));
        table.append(row);
      } else {
        value.forEach(v => table
            .append($('<tr></tr>')
              .append(helper(v, $('<td></td>'), true, depth + 1))));
      }
      outer.append(table);
    } else if (typeof value == 'object' && 'tag' in value) {
      let table = style($('<table></table>'));
      table.append($('<tr></tr>')
        .append($('<th></th>')
          .attr('colspan', 2)
          .text(value.tag)));
      for (let field in value.fields) {
        table.append($('<tr></tr>')
          .append($('<td></td>').text(field))
          .append(helper(value.fields[field], $('<td></td>'), true, depth + 1)));
      }
      outer.append(table);
    } else if (typeof value == 'object') {
      let table = style($('<table></table>'));
      for (let field in value) {
        table.append($('<tr></tr>')
          .append($('<td></td>').text(field))
          .append(helper(value[field], $('<td></td>'), true, depth + 1)));
      }
      outer.append(table);
    } else if (typeof value == 'string') {
      outer.text(value);
    } else {
      outer.text(JSON.stringify(value, null, 2));
    }
    return outer;
  };
  return helper(value.toJSON(), outer, true, 0);
};
let toHTMLString = value => toHTML(value, jQuery('<div></div>')).html();


class Controller {
  constructor() {
    this.views = [];
    this.toHTML = toHTML;
    this.toHTMLString = toHTMLString;
    this.React = React;
  }
  stateChanged() {
    this.views.forEach((view) => view.update());
  }
}

class DefaultView {
  constructor(controller, elem, module) {
    this.controller = controller;
    this.elem = elem;
    this.module = module;
    this.update();
  }

  update() {
    let output = Array.from(this.module.env.vars.list())
      .map(k => [k, this.module.env.vars.get(k)])
      .filter(kv => kv[1].isConstant !== true)
      .map(kv => `${kv[0]}: ${kv[1]}`)
      .join('\n');
    this.elem.text(output);
  }
}

class HTMLStateView {
  constructor(controller, elem, module) {
    this.controller = controller;
    this.elem = elem;
    this.module = module;
    this.update();
  }


  update() {
    let $ = jQuery;
    let output = Array.from(this.module.env.vars.list())
      .map(k => [k, this.module.env.vars.get(k)])
      .filter(kv => kv[1].isConstant !== true)
      .map(kv => {
        return `${kv[0]}: ${toHTMLString(kv[1])}`;
      })
      .join('\n');
    this.elem.html(output);
  }
}

let pageLoaded = new Promise((resolve, reject) => {
  jQuery(window).load(resolve);
});

let simulateId = undefined;

let getParams = queryString.parse(window.location.search.slice(1));
let basename = 'examples/tokenring';
if ('model' in getParams) {
  basename = 'examples/' + getParams['model'];
}

Promise.all([
  fetchRemoteFile(basename + '.model'),
  fetchRemoteJSX(basename + '.jsx'),
  pageLoaded,
]).then((results) => {
  let input = results[0];
  jQuery('#code').text(input.getText());
  let env = new GlobalEnvironment(prelude.env);
  let module;
  try {
    module = compiler.load(input, env);
    window.module = module;
    module.ast.execute();
  } catch ( e ) {
    jQuery('#error').text(e);
    return;
  }
  let controller = new Controller();
  controller.views.push(
    new DefaultView(controller, jQuery('#state'), module));
  controller.views.push(
    new HTMLStateView(controller, jQuery('#state2'), module));

  let userView = results[1];
  controller.views.push(
    new userView(controller, jQuery('#view #user')[0], module));

  jQuery('#simulate').click(() => {
    if (simulateId === undefined) {
      let step = () => {
        try {
          simulator(module);
        } catch ( e ) {
          jQuery('#error').text(e);
          return;
        }
        controller.stateChanged();
      };
      step();
      simulateId = setInterval(step, 2000);
    } else {
      window.clearTimeout(simulateId);
      simulateId = undefined;
    }
    return false;
  });


  let viewWrapper = jQuery('#viewwrapper');
  let viewElem = jQuery('#view');
  viewWrapper.mouseup(() => {
    let width = viewWrapper.width();
    let height = viewWrapper.height();
    console.log(`resize to ${width}, ${height}`);
    viewElem.width(width);
    viewElem.height(height);
    if (width < height) {
      height = height / width * 100;
      width = 100;
    } else {
      width = width / height * 100;
      height = 100;
    }
    // viewElem.attr('viewBox', ...) sets viewbox (lowercase) instead
    viewElem[0].setAttribute('viewBox',
      `0 0 ${width} ${height}`);
    controller.stateChanged();
  });
});
