/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

"use strict";

let _ = require('lodash');
let React = require('react');
let ReactDOM = require('react-dom');

let addSVGCoords = (e, svgNode) => {
  let ctm = svgNode.getScreenCTM().inverse();
  let translated = ctm.translate(e.clientX, e.clientY);
  e.svgX = translated.e;
  e.svgY = translated.f;
};

let numTics = 11;
let ticXs = (x, width) => _.range(11).map(i => x + i/10 * width);

let makeTime = (clock, last) => {
  let t = `${_.round(clock / 1000, 3)}`;
  if (controller.clockUnits !== undefined && last) {
    t += controller.clockUnits;
  }
  return t;
};

let Labels = React.createClass({
  render: function() {
    return <g>
      {ticXs(this.props.x, this.props.width).map((ticX, i) =>
        <text
            key={i}
            x={ticX + (i == 10 ? this.props.width / 40 : 0)}
            y={this.props.y}
            style={{
              fontSize: 32,
              textAnchor: 'middle',
              fill: 'gray',
            }}>
              {makeTime(this.props.maxClockShown * i/(numTics - 1), i == 10)}
         </text>)
       }
      </g>;
  },
});

let Timeline = React.createClass({
  render: function() {
    let x = clock =>
      this.props.x + this.props.width * clock / this.props.maxClockShown;
    let startx = x(this.props.execution.forkStart().getEvent().clock);
    let parentLine = [];
    if (this.props.parentY !== undefined) {
      parentLine = <line
        x1={startx}
        x2={startx}
        y1={this.props.parentY}
        y2={this.props.y}
        style={{stroke: 'green', strokeWidth: 3}} />;
    }

    return <g>
      {ticXs(this.props.x, this.props.width).map((ticX, i) => {
        return <line key={i}
              x1={ticX}
              x2={ticX}
              y1={this.props.y - 10}
              y2={this.props.y + 10}
              style={{stroke: 'gray', strokeWidth: 1}} />;
       })}
      <line
        x1={this.props.x}
        x2={this.props.x + this.props.width}
        y1={this.props.y}
        y2={this.props.y}
        style={{stroke: 'gray', strokeWidth: 3}} />
      <line
        x1={x(this.props.execution.forkStart().getEvent().clock)}
        x2={x(this.props.execution.last().getEvent().clock)}
        y1={this.props.y}
        y2={this.props.y}
        style={{stroke: 'green', strokeWidth: 5}} />
      {parentLine}
    </g>;
  },
});

let Slider = React.createClass({
  getInitialState: function() {
    return {
      dragging: false,
      x: 0,
      y: 0,
      ref: null,
    };
  },

  render: function() {
    let frac = this.props.controller.workspace.clock / this.props.maxClockShown;
    if (this.state.dragging) {
      frac = _.clamp((this.state.x - this.props.x) / this.props.width, 0, 1);
    }

    let cursor = this.props.controller.workspace.cursor;
    let i = _.indexOf(this.props.executions, cursor.execution);

    return <circle
        cx={this.props.x + this.props.width * frac}
        cy={this.props.execY(i)}
        r={20}
        style={{fill: this.state.dragging ? 'red' : 'black'}}
        className={this.state.dragging ? 'grabbing' : 'grab'}
        onMouseDown={this.onMouseDown} />;
  },

  onMouseDown: function(e) {
    addSVGCoords(e, e.target);
    let targetX = Number(e.target.getAttribute('cx'));
    let targetY = Number(e.target.getAttribute('cy'));
    this.setState({
      dragging: true,
      x: targetX,
      y: targetY,
      offsetX: e.svgX - targetX,
      offsetY: e.svgY - targetY,
      ref: e.target,
    });
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  },

  onMouseMove: function(e) {
    if (this.state.dragging) {
      addSVGCoords(e, this.state.ref);
      let x = e.svgX - this.state.offsetX;
      let y = e.svgY - this.state.offsetY;
      let frac = _.clamp((x - this.props.x) / this.props.width, 0, 1);
      let clock = frac * this.props.maxClockShown;
      let executionWithI = _.minBy(
        this.props.executions.map((e, i) => [e, i]),
        ei => Math.abs(this.props.execY(ei[1]) - y));
      console.log(executionWithI[1]);
      this.props.controller.workspace.reset(executionWithI[0].last(), 0);
      this.props.controller.workspace.setClock(clock);
      this.setState({
        x: x,
        y: y,
      });
    }
  },

  onMouseUp: function(e) {
    this.setState({
      dragging: false,
      ref: null,
    });
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

});

let Timelines = React.createClass({
  render: function() {
    let roots = new Set();
    let children = new Map(); // maps all known executions to their children
    this.props.controller.executions.forEach(child => {
      if (!children.has(child)) {
        children.set(child, new Set());
      }
      let parentCursor = child.last().parent();
      while (true) {
        if (parentCursor === null) {
          roots.add(child);
          break;
        }
        if (children.has(parentCursor.execution)) {
          children.get(parentCursor.execution).add(child);
          break;
        } else {
          children.set(parentCursor.execution, new Set([child]));
        }
        child = parentCursor.execution;
        parentCursor = parentCursor.parent();
      }
    });

    let executions = [];
    let dfs = execution => {
      executions.push(execution);
      let c = Array.from(children.get(execution));
      c = _.sortBy(c, e => e.forkStart().getEvent().clock);
      c.reverse();
      c.forEach(dfs);
    };
    roots.forEach(dfs);

    let clocks = this.props.controller.executions
      .map(execution => execution.last().getEvent().clock);
    let maxClockGen = Math.max(...clocks);
    let maxClockShown = 1e4;
    while (maxClockGen > maxClockShown * .8) {
      maxClockShown *= 10;
    }

    let execY = i => this.props.y + 30 * (i + 1);

    return <g>
        <rect
          x={this.props.x}
          y={this.props.y}
          width={this.props.width}
          height={this.props.height}
          style={{stroke: 'none', fill: 'none'}} />
        <Labels
          x={this.props.x}
          width={this.props.width}
          y={this.props.y}
          maxClockShown={maxClockShown} />
        {executions.map((execution, i) => {
          let parentY;
          if (execution.last().parent() !== null) {
            let parentExecution = execution.last().parent().execution;
            parentY = execY(executions.indexOf(parentExecution));
          }
          return <Timeline
            key={i}
            controller={this.props.controller}
            x={this.props.x}
            y={execY(i)}
            parentY={parentY}
            width={this.props.width}
            height={this.props.height}
            execution={execution}
            maxClockShown={maxClockShown} />;
        })}
        <Slider
          x={this.props.x}
          y={this.props.y}
          width={this.props.width}
          height={this.props.height}
          executions={executions}
          execY={execY}
          controller={this.props.controller}
          maxClockShown={maxClockShown} />
      </g>;
  }
});

class TimelineView {
  constructor(controller, elem, module) {
    this.name = 'Timeline';
    this.controller = controller;
    this.elem = elem;
    this.module = module;
    this.component = ReactDOM.render(
      React.createElement(Timelines, {
        controller: this.controller,
        x: 75,
        y: 50,
        width: 850,
        height: 100,
      }), elem);
  }
  update(changes) {
    this.component.setState({});
  }
}

Timelines.TimelineView = TimelineView;

module.exports = Timelines;
