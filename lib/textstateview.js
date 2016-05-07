/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

'use strict';

class TextStateView {
  constructor(controller, elem, module) {
    this.name = 'TextStateView';
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

module.exports = TextStateView;
