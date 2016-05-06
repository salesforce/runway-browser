/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

"use strict";

let Changesets = require('runway-compiler/lib/changesets.js');
let React = require('react');
let ReactDOM = require('react-dom');
let jQuery = require('jquery');

let View = function(controller, elem, module) {

let RuleControlsView = React.createClass({
  getInitialState: function() {
    return {
      changes: [''],
    };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    let changes = new Set(nextState.changes);
    changes.delete('clock');
    changes.delete('execution');
    return Changesets.affected(changes, '');
  },

  render: function() {
    let rules = controller.workspace.getRulesets().map(ruleset => {
      if (ruleset.rulefor) {
        let anyEnabled = false;
        let options = ruleset.rules.map(rule => {
          if (!Changesets.empty(rule.wouldChangeState())) {
            anyEnabled = true;
            return <li key={rule.name}>
                <a href="#" onClick={() => rule.fire()}>
                  {rule.name}
                </a>
              </li>;
          } else {
            return <li key={rule.name} className="disabled">
                <a href="#">
                  {rule.name}
                </a>
              </li>;
          }
        });
        if (options.length === 0) {
          options.push(<li key="0" className="dropdown-header">
              Inactive
            </li>);
        }
        return <div className="btn-group" key={ruleset.name}>
            <button className={`btn btn-default btn-sm dropdown-toggle ` +
              `${anyEnabled ? '' : 'disabled'}`}
            data-toggle="dropdown">
              {ruleset.name}{' '}
              <span className="caret"></span>
            </button>
            <ul className="dropdown-menu">
              {options}
            </ul>
          </div>;

      } else {
        let rule = ruleset.rules[0];
        if (!Changesets.empty(rule.wouldChangeState())) {
          return <div className="btn-group" key={rule.name}>
              <button
                className="btn btn-default btn-sm"
                onClick={() => rule.fire()}>
                  {rule.name}
              </button>
            </div>;
        } else {
          return <div className="btn-group" key={rule.name}>
              <button
                className="btn btn-default btn-sm disabled">
                  {rule.name}
              </button>
            </div>;
        }
      }
    });

/*
    rules.push(<div className="btn-group" key="reset">
      <button
        className="btn btn-default btn-sm"
        onClick={() => controller.resetToStartingState()}>
          reset
      </button>
    </div>);
*/

    return <div className="btn-toolbar">
        {rules}
      </div>;
  }

});

let reactComponent = ReactDOM.render(<RuleControlsView />, elem);

return {
  name: 'RuleControls',
  update: function(changes) {
    reactComponent.setState({changes: changes});
  }
};

}; // View

module.exports = View;
