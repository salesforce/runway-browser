"use strict";

let RuleFor = require('../statements/rulefor.js');
let React = require('react');
let ReactDOM = require('react-dom');
let jQuery = require('jquery');

let View = function(controller, elem, module) {

let RuleControlsView = React.createClass({
  render: function() {
    let groups = [];
    module.env.rules.forEachLocal((rule, name) => {
      let group = [];
      if (rule instanceof RuleFor) {
        let indextype = rule.expr.evaluate().forEach((v, i) => {
          group.push(<button
              className="btn btn-default"
              key={`${name}-${i}`}
              onClick={() => controller.tryChangeState(() => {
                rule.fire(i);
                return `${name}(${i})`;
              })}>
                {`${name}(${i})`}
            </button>);
        });
      } else {
        group.push(<button
            className="btn btn-default"
            key={name}
            onClick={() => controller.tryChangeState(() => {
              rule.fire();
              return name;
            })}>
              {name}
          </button>);
      }
      groups.push(<div className="btn-group" key={name}>
          {group}
        </div>);
    });
    groups.push(<div className="btn-group" key="reset">
      <button
        className="btn btn-default"
        onClick={() => controller.resetToStartingState()}>
          reset
      </button>
    </div>);
    return <div>{groups}</div>;
  }

});

let reactComponent = ReactDOM.render(<RuleControlsView />, elem);

return {
  update: function() {
    reactComponent.setState({});
  }
};

}; // View

module.exports = View;
