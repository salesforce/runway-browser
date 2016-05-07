/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

"use strict";

let React = require('react');
let ReactDOM = require('react-dom');
let jQuery = require('jquery');
let Changesets = require('runway-compiler/lib/changesets.js');

let colors = [ // from colorbrewer2.org
  //'#8c510a',
  '#d8b365',
  '#f6e8c3',
  '#f5f5f5',
  '#c7eae5',
  '#5ab4ac',
  '#01665e',
];

let StateDump = React.createClass({

  getInitialState: function() {
    return {
      editing: false,
      changes: [''],
    };
  },

  edit: function() {
    this.setState({editing: true});
  },

  saved: function() {
    this.setState({editing: false});
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    console.assert(nextProps.changes !== undefined);
    return Changesets.affected(nextProps.changes, this.props.path);
  },

  render: function() {
    let controller = this.props.controller;
    let editing = this.state.editing;
    let value = this.props.value;
    let horizontal = this.props.horizontal;
    if (horizontal === undefined) {
      horizontal = true;
    }
    let depth = this.props.depth;
    if (depth === undefined) {
      depth = 0;
    }
    let color = colors[depth % colors.length];
    let kind = undefined;
    if (_.hasIn(value, 'type')) {
      kind = value.type.constructor.name;
    }
    let tableStyle = {background: color};

    let nested = (value, subpath) =>
      <StateDump
        value={value}
        horizontal={!horizontal}
        depth={depth + 1}
        controller={controller}
        path={`${this.props.path}${subpath}`}
        changes={this.props.changes} />;

    let fieldRows = (value, type, subpath) =>
      type.fieldtypes
        .map(t => t.name)
        .map(fieldname =>
          <tr key={fieldname}>
            <td>
              {fieldname}
            </td>
            <td>
              {nested(value.lookup(fieldname), `${subpath}.${fieldname}`)}
            </td>
          </tr>);

    let change = makeChange => (e => {
      controller.workspace.tryChangeState(() => {
        makeChange(e.target.value);
        this.setState({});
        return `edited ${this.props.path}`;
      });
    });

    let makeTime = clock => {
      let t = `${_.round(clock / 1000, 3)}`;
      if (controller !== undefined && controller.clockUnits !== undefined) {
        t += controller.clockUnits;
      }
      return t;
    };

    if (_.hasIn(value, 'forEach')) {
      // kind == 'ArrayType' || kind == 'SetType' || kind == 'OrderedSetType'

      if (horizontal) {
        let irow = [];
        let vrow = [];
        value.forEach((v, i) => {
          irow.push(<td key={i}>{i}</td>);
          vrow.push(<td key={i}>{nested(v, `[${i}]`)}</td>);
        });
        return <table className="statedump" style={tableStyle}>
            <thead>
              <tr>{irow}</tr>
            </thead>
            <tbody>
              <tr>{vrow}</tr>
            </tbody>
          </table>;
      } else {
        let rows = [];
        value.forEach((v, i) => {
          rows.push(<tr key={i}>
              <td>{i}</td>
              <td>{nested(v, `[${i}]`)}</td>
            </tr>);
        });
        return <table className="statedump" style={tableStyle}>
            <tbody>{rows}</tbody>
          </table>;
      }

    } else if (kind == 'RecordType') {

      return <table className="statedump" style={tableStyle}>
          <tbody>
            {fieldRows(value, value.type, '')}
          </tbody>
        </table>;

    } else if (kind == 'EitherVariant' || kind == 'EitherType') {

      let select = [];
      if (editing) {
        let options = value.eithertype.variants
          .map(v => v.name)
          .map(name => <option key={name} value={name}>{name}</option>);
        select = <select className="form-control"
          value={value.varianttype.name}
          onChange={change(entered => {
            value.assign(value.eithertype.getVariant(entered).makeDefaultValue());
            this.saved();
          })}>
          {options}
        </select>;
      }

      if (value.fields === undefined) {
        if (editing) {
          return select;
        } else {
          return <span className="clickable" onClick={this.edit}>
            {value.varianttype.name}
          </span>;
        }
      } else {
        return <table className="statedump" style={tableStyle}>
            <thead>
              <tr>
                {editing ? (
                  <th colSpan={2}>
                    {select}
                  </th>
                ) : (
                  <th colSpan={2} className="clickable" onClick={this.edit}>
                    {value.varianttype.name}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {fieldRows(value, value.varianttype.recordtype, `!${value.varianttype.name}`)}
            </tbody>
          </table>;
      }

    } else if (kind == 'RangeType') {

      if (editing) {
        return <input className="form-control"
          value={value.toString()}
          onChange={change(entered => value.assign(Number(entered)))}
          onBlur={this.saved} />;
      } else {
        return <span className="clickable" onClick={this.edit}>
            {value.toString()}
          </span>;
      }

    } else if (kind == 'NumberType' &&
      controller !== undefined &&
      value.type == controller.workspace.module.env.types.get('Time')) {
      return <span>{makeTime(value.value)}</span>;
    } else if (this.props.path == 'clock') {
      return <span>{makeTime(value)}</span>;
    } else {
      return <span>{value.toString()}</span>;
    }
  },
});

let StateDumpEnv = React.createClass({

  getInitialState: function() {
    return {
      changes: [''],
    };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    console.assert(nextState.changes !== undefined);
    return !Changesets.empty(nextState.changes);
  },

  render: function() {
    let env = this.props.env;
    let vars = [];
    env.vars.forEach((value, name) => {
      if (!value.isConstant) {
        vars.push(<div key={name}>
          {name}:
          <StateDump
            value={value}
            controller={this.props.controller}
            path={name}
            changes={this.state.changes} />
        </div>);
      }
    });
    return <div>
      clock:
      <StateDump
        value={this.props.controller.workspace.clock}
        controller={this.props.controller}
        path="clock"
        changes={this.state.changes} />
      {vars}
      </div>;
  },
});

// deprecated
let toHTMLString = value => {
  let div = jQuery('<div></div>');
  let component = ReactDOM.render(
    React.createElement(
      StateDump,
      {value: value}),
    div[0]);
  let html = div.html();
  ReactDOM.unmountComponentAtNode(div[0]);
  return html;
};

class HTMLStateView {
  constructor(controller) {
    this.name = 'HTMLStateView';
    this.controller = controller;
    this.component = this.controller.mountTab(elem =>
       ReactDOM.render(
        React.createElement(
          StateDumpEnv,
          {
            env: this.controller.workspace.module.env,
            controller: this.controller,
          }),
        elem), 'state', 'State');
  }

  update(changes) {
    this.component.setState({changes: changes});
  }
}

module.exports = {
  toHTMLString: toHTMLString,
  StateDump: StateDump,
  StateDumpEnv: StateDumpEnv,
  HTMLStateView: HTMLStateView,
};
