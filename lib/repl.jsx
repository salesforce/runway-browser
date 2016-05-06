/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

"use strict";

let Input = require('runway-compiler/lib/input.js');
let Util = require('runway-compiler/lib/util.js');
let React = require('react');
let ReactDOM = require('react-dom');

let View = function(controller) {

let module = controller.workspace.module;

let REPLView = React.createClass({
  getInitialState() {
    return {
      input: '',
      history: [],
    };
  },

  onChangeInput: function(event) {
    let input = event.target.value;
    let matched = (left, right) =>
      (Util.stringCount(input, left) ===
       Util.stringCount(input, right));
    if (input.endsWith('\n\n') ||
        (input.endsWith('\n') &&
         matched('(', ')') &&
         matched('{', '}') &&
         matched('[', ']'))) {
      let output = '(any output is shown in the dev console for now)';
      let error = false;
      controller.workspace.tryChangeState(() => {
        try {
          // TODO: use forgivingLoad from main.js
          let context = {};
          let nmodule = compiler.load(new Input('REPL', input),
                                      module.ast.env, context);
          nmodule.ast.execute(context);
        } catch (e) {
          error = true;
          output = e.toString();
        }
        return `REPL (${this.state.history.length + 1})`;
      });
      let repi = {
        input: input,
        output: output,
      };
      this.setState({
        input: error ? input.substr(0, input.length - 1) : '',
        history: this.state.history.concat(repi),
      }, () => {
        if (this.pre !== null) {
          this.pre.scrollTop = 10000;
        }
      });
    } else {
      this.setState({
        input: input,
      });
    }
  },

  render: function() {
    let history = [];
    this.state.history.forEach((repi, i) => {
      // input
      let lines = repi.input.split('\n');
      history.push((i + 1) + '> ' + lines[0]);
      history = history.concat(
        lines.slice(1, lines.length - 1)
          .map(l => '... ' + l));
      // output
      lines = repi.output.split('\n');
      history = history.concat(
        lines.map(l => ' ' + l));
    });

    return <div>
        <pre style={{maxHeight: '30em', scroll: 'auto'}}
          ref={pre => {this.pre = pre;}}>
          <code>
            {history.join('\n')}
          </code>
        </pre>
        <textarea
          value={this.state.input}
          onChange={this.onChangeInput} />
      </div>;
  }

});

let reactComponent = controller.mountTab(elem => ReactDOM.render(<REPLView />, elem),
  'repl', 'REPL');

return {
  name: 'REPL',
  update: function() {
  }
};

}; // View

module.exports = View;
