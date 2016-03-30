"use strict";

let _ = require('lodash');
let Changesets = require('runway-compiler/changesets.js');
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
      let time = '';
      if (controller.clockUnits !== undefined) {
        time = `${_.round(event.clock / 1000, 3)} ${controller.clockUnits}: `;
      }
      let background;
      if (i === current) {
        background = '#ddd';
      }
      return <li key={i} style={{background: background}}>
        <a href=""
          onClick={e => {
            e.preventDefault();
            controller.workspace.setClock(event.clock);
          }}
          style={style}>
            {`${time}${event.msg}`}
        </a>
      </li>;
    };
    let cursor = controller.workspace.cursor.execution.last();
    let current = controller.workspace.cursor.index();

    return <ol
      start={cursor.index()}
      reversed="1">
        {cursor.map(renderEvent).reverse()}
    </ol>;
  }

});

let reactComponent = ReactDOM.render(<ExecutionView />, elem);

return {
  name: 'Execution',
  tab: 'execution',
  update: function(changes) {
    reactComponent.setState({changes: changes});
  }
};

}; // View

module.exports = View;
