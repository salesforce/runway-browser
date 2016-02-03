"use strict";

let React = require('react');
let ReactDOM = require('react-dom');
let jQuery = require('jquery');

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
    return {editing: false};
  },

  edit: function() {
    this.setState({editing: true});
  },

  saved: function() {
    this.setState({editing: false});
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
    let kind = value.type.constructor.name;
    let tableStyle = {background: color};

    let nested = (value, subpath) =>
      <StateDump
        value={value}
        horizontal={!horizontal}
        depth={depth + 1}
        controller={controller}
        path={`${this.props.path}${subpath}`} />;

    let fieldRows = (value, type) =>
      type.fieldtypes
        .map(t => t.name)
        .map(fieldname =>
          <tr key={fieldname}>
            <td>
              {fieldname}
            </td>
            <td>
              {nested(value.lookup(fieldname), `.${fieldname}`)}
            </td>
          </tr>);

    let change = makeChange => (e => {
      controller.tryChangeState(() => {
        makeChange(e.target.value);
        this.setState({});
        return `edited ${this.props.path}`;
      });
    });


    if ('forEach' in value) {
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
            {fieldRows(value, value.type)}
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
              {fieldRows(value, value.varianttype.recordtype)}
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

    } else {
      return <span>{value.toString()}</span>;
    }
  },
});

let StateDumpEnv = React.createClass({
  render: function() {
    let env = this.props.env;
    let vars = [];
    env.vars.forEachLocal((value, name) => {
      if (!value.isConstant) {
        vars.push(<div key={name}>
          {name}:
          <StateDump
            value={value}
            controller={this.props.controller}
            path={name} />
        </div>);
      }
    });
    return <div>
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

module.exports = {
  toHTMLString: toHTMLString,
  StateDump: StateDump,
  StateDumpEnv: StateDumpEnv,
};