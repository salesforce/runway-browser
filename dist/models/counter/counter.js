/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

'use strict';

let d3 = require('d3');
let View = function(controller, svg, module) {
  let model = module.env;
  svg = d3.select(svg)
    .classed('counter', true)
    .append('g');
  let text = svg.append('text')
    .attr('x', 10)
    .attr('y', 20);

  return {
    name: 'CounterView',
    update: function(changes) {
      let output = '';
      let counterVar = model.vars.get('counter');
      if (counterVar !== undefined) {
        output = counterVar.toString();
      }
      text.text(output);
    },
  };
}; // View

module.exports = View;
