"use strict";

let RuleFor = require('../statements/rulefor.js');
let React = require('react');
let ReactDOM = require('react-dom');
let jQuery = require('jquery');

let View = function(controller, elem, module) {

let RuleControlsView = React.createClass({
  render: function() {
    let rules = [];
    module.env.rules.forEachLocal((rule, name) => {
      if (rule instanceof RuleFor) {
        let options = [];
        let anyEnabled = false;
        let indextype = rule.expr.evaluate().forEach((v, i) => {
          if (controller.wouldChangeState(() => rule.fire(i))) {
            anyEnabled = true;
            options.push(<li key={`${name}-${i}`}>
                <a href="#"
                   onClick={() => controller.tryChangeState(() => {
                    rule.fire(i);
                    return `${name}(${i})`;
                   })}>
                      {`${name}(${i})`}
                </a>
              </li>);
          } else {
            options.push(<li key={`${name}-${i}`} className="disabled">
                <a href="#">
                  {`${name}(${i})`}
                </a>
              </li>);

          }
        });
        if (options.length == 0) {
          options.push(<li key="0" className="dropdown-header">
              Inactive
            </li>);
        }
        rules.push(<div className="btn-group" key={name}>
            <button className={`btn btn-default btn-sm dropdown-toggle ` +
              `${anyEnabled ? '' : 'disabled'}`}
            data-toggle="dropdown">
              {name}{' '}
              <span className="caret"></span>
            </button>
            <ul className="dropdown-menu">
              {options}
            </ul>
          </div>);

      } else {
        if (controller.wouldChangeState(() => rule.fire())) {
          rules.push(<div className="btn-group" key={name}>
              <button
                className="btn btn-default btn-sm"
                onClick={() => controller.tryChangeState(() => {
                  rule.fire();
                  return name;
                })}>
                  {name}
              </button>
            </div>);
        } else {
          rules.push(<div className="btn-group" key={name}>
              <button
                className="btn btn-default btn-sm disabled">
                  {name}
              </button>
            </div>);
        }
      }
    });

    rules.push(<div className="btn-group" key="reset">
      <button
        className="btn btn-default btn-sm"
        onClick={() => controller.resetToStartingState()}>
          reset
      </button>
    </div>);

    return <div className="btn-toolbar">
        {rules}
      </div>;
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
