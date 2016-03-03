"use strict";

let _ = require('lodash');
let Changesets = require('../changesets.js');
let React = require('react');
let ReactDOM = require('react-dom');

let View = function(controller, elem, module) {

let ExecutionView = React.createClass({

  getInitialState: function() {
    return {
      changes: [''],
    };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return Changesets.affected(nextState.changes, 'execution');
  },

  render: function() {
    let renderEvent = (event, i) => {
      return <li key={i}>
        <a href=""
          onClick={e => {
          e.preventDefault();
          controller.viewContext.setClock(event.clock);
        }}>
          {_.round(event.clock / 1000, 1)} ms: {event.msg}
        </a>
      </li>;
    };

    let execution = controller.genContext.cursor.execution;
    
    return <ol
      start={execution.size()}
      reversed="1"
      style={{overflowY: 'auto', maxHeight: '10em'}}>
        {execution.map(renderEvent).reverse()}
    </ol>;
  }

});

let reactComponent = ReactDOM.render(<ExecutionView />, elem);

return {
  name: 'Execution',
  update: function(changes) {
    reactComponent.setState({changes: changes});
  }
};

}; // View

module.exports = View;
