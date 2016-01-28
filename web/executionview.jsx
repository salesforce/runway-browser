"use strict";

let RuleFor = require('../statements/rulefor.js');
let React = require('react');
let ReactDOM = require('react-dom');
let jQuery = require('jquery');

let View = function(controller, elem, module) {

let ExecutionView = React.createClass({
  render: function() {
    return <ol reversed="1" style={{overflowY: 'auto', maxHeight: '10em'}}>
      {controller.execution.map((execution, i) =>
        <li key={i}>
          {execution.msg}
        </li>
      ).reverse()}
    </ol>;
  }

});

let reactComponent = ReactDOM.render(<ExecutionView />, elem);

return {
  update: function() {
    reactComponent.setState({});
  }
};

}; // View

module.exports = View;
