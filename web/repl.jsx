"use strict";

let Input = require('../input.js');
let Util = require('../util.js');
let React = require('react');
let ReactDOM = require('react-dom');

let View = function(controller, elem, module) {

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
      controller.tryChangeState(() => {
        try {
          // TODO: use forgivingLoad from main.js
          let nmodule = compiler.load(new Input('REPL', input),
                                      module.ast.env);
          nmodule.ast.execute();
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
        <pre style={{maxHeight: '10em', scroll: 'auto'}}
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

let reactComponent = ReactDOM.render(<REPLView />, elem);

return {
  name: 'REPL',
  update: function() {
  }
};

}; // View

module.exports = View;
