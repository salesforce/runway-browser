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

  /*
  shouldComponentUpdate: function(nextProps, nextState) {
    return Changesets.affected(nextState.changes, '');
  },
  */

  render: function() {
    let renderEvent = (event, i) => {
      let style = {};
      if (event.passedInvariants === false) {
        style = {color: 'red'};
      }
      return <li key={i}>
        <a href=""
          onClick={e => {
            e.preventDefault();
            controller.workspace.setClock(event.clock);
          }}
          style={style}>
            {_.round(event.clock / 1000, 1)} ms: {event.msg}
        </a>
      </li>;
    };

    return <ol
      start={controller.workspace.cursor.index()}
      reversed="1"
      style={{overflowY: 'auto', maxHeight: '10em'}}>
        {controller.workspace.cursor.map(renderEvent).reverse()}
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
