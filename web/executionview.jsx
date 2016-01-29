"use strict";

let RuleFor = require('../statements/rulefor.js');
let React = require('react');
let ReactDOM = require('react-dom');
let jQuery = require('jquery');

let View = function(controller, elem, module) {

let ExecutionView = React.createClass({
  render: function() {
    let renderExecution = (execution, i) => {
      return <li key={i}>
        <a href=""
          onClick={e => {
          e.preventDefault();
          controller.restore(execution);
        }}>
          {execution.msg}
        </a>
      </li>;
    };

    return <ol
      start={controller.execution.length - 1}
      reversed="1"
      style={{overflowY: 'auto', maxHeight: '10em'}}>
        {controller.execution.map(renderExecution).reverse()}
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
