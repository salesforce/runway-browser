/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

"use strict";

let _ = require('lodash');
let Changesets = require('runway-compiler/lib/changesets.js');
let React = require('react');
let ReactDOM = require('react-dom');
let files = require('./files.js');
let Execution = require('runway-compiler/lib/execution.js');

let View = function(controller) {

let getExecution = function() {
  let events = controller.workspace.cursor.execution
    .map(e => JSON.stringify(e, null, 2))
    .join(',\n\n');
  return `[\n\n${events}\n\n]`;
};

let ExecutionHeader = React.createClass({
  render: function() {
    return (
      <div id="execution-header">
        <div className="btn-group" style={{padding: 10}}>
          <button type="button" className="btn btn-default download"
            onClick={() => files.download(getExecution(), 'execution.json', 'application/json')}>
              Download
          </button>
          <button type="button" className="btn btn-default upload"
            onClick={() => files.upload('application/json').then(text => {
              let execution = new Execution(JSON.parse(text));
              controller.workspace.reset(execution.forkStart(), 0);
            })}>
              Upload
          </button>
        </div>
      </div>
    );
  }
});

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

    return <div>
      <ExecutionHeader />
      <ol
        start={cursor.index()}
        reversed="1">
          {cursor.map(renderEvent).reverse()}
      </ol>
    </div>;
  }

});

class Tab {
  constructor(elem) {
    this.reactComponent = ReactDOM.render(<ExecutionView />, elem);
  }
  update(changes) {
    this.reactComponent.setState({changes: changes});
  }
  unmount() {
    ReactDOM.unmountComponentAtNode(this.reactComponent.getDOMNode());
  }
}
let tab = controller.mountTab(elem => new Tab(elem), 'execution', 'Execution');

return {
  name: 'Execution',
  update: changes => {
    tab.update(changes);
  },
  unmount: () => {
    tab.unmount();
    controller.unmountTab('execution');
  }
};

}; // View

module.exports = View;
