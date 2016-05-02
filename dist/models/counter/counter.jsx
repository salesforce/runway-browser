"use strict";

let React = require('React');
let ReactDOM = require('ReactDOM');

let View = function(controller, svg, module) {

let model = module.env;

let CounterView = React.createClass({
  render: function() {
    let output = '';
    let counterVar = model.vars.get('counter');
    if (counterVar !== undefined) {
      output = counterVar.toString();
    }
    return <g>
        <text x={10} y={20}>{output}</text>
      </g>;
  },
});

let reactComponent = ReactDOM.render(<CounterView />, svg);

return {
  update: function() {
    // trigger a render
    reactComponent.setState({}, () => {
      console.log('rendered');
    });
  }
};

}; // View

module.exports = View;
