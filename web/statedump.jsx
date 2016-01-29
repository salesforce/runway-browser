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
  render: function() {
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

    let nested = value =>
      <StateDump
        value={value}
        horizontal={!horizontal}
        depth={depth + 1} />;

    let fieldRows = (value, type) =>
      type.fieldtypes
        .map(t => t.name)
        .map(fieldname =>
          <tr key={fieldname}>
            <td>
              {fieldname}
            </td>
            <td>
              {nested(value.lookup(fieldname))}
            </td>
          </tr>);


    if ('forEach' in value) {
      // kind == 'ArrayType' || kind == 'SetType' || kind == 'OrderedSetType'

      if (horizontal) {
        let irow = [];
        let vrow = [];
        value.forEach((v, i) => {
          irow.push(<td key={i}>{i}</td>);
          vrow.push(<td key={i}>{nested(v)}</td>);
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
              <td>{nested(v)}</td>
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

      if (value.fields === undefined) {
        return <span>{value.varianttype.name}</span>;
      } else {
        return <table className="statedump" style={tableStyle}>
            <thead>
              <tr>
                <th colSpan={2}>
                  {value.varianttype.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {fieldRows(value, value.varianttype.recordtype)}
            </tbody>
          </table>;
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
          {name}: <StateDump value={value} />
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
