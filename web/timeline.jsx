"use strict";

let _ = require('lodash');
let React = require('react');

let addSVGCoords = (e, svgNode) => {
  let ctm = svgNode.getScreenCTM().inverse();
  let translated = ctm.translate(e.clientX, e.clientY);
  e.svgX = translated.e;
  e.svgY = translated.f;
};

let Timeline = React.createClass({
  getInitialState: function() {
    return {
      dragging: false,
      x: 0,
      y: 0,
      ref: null,
    };
  },

  max: function(clock) {
    let max = 1e6;
    while (clock > max * .8) {
      max *= 10;
    }
    return max;
  },

  render: function() {
    let lineY = this.props.y + this.props.height * 3/4;
    let max = this.max(this.props.controller.clock);
    let maxClockFrac = this.props.controller.clock / max;
    let frac = maxClockFrac;
    if (this.state.dragging) {
      frac = _.clamp((this.state.x - this.props.x) / this.props.width, 0, 1);
    }
    let tics = _.range(11).map(i => {
      let ticX = this.props.x + i/10 * this.props.width;
      let label = `${max * i/10 / 1e6}s`;
      return <g key={`tic-${i}`}>
          <line
            x1={ticX} 
            x2={ticX} 
            y1={lineY - 15} 
            y2={lineY + 15} 
            style={{stroke: 'gray', strokeWidth: 3}} />
          <text
            x={ticX}
            y={lineY - 20}
            style={{
              fontSize: 32,
              textAnchor: 'middle',
              fill: 'gray',
            }}>
              {label}
          </text>
        </g>;
    });
    return <g>
      <rect
        x={this.props.x}
        y={this.props.y}
        width={this.props.width}
        height={this.props.height}
        style={{stroke: 'none', fill: 'none'}} />
      <line
        x1={this.props.x}
        x2={this.props.x + this.props.width}
        y1={lineY}
        y2={lineY}
        style={{stroke: 'gray', strokeWidth: 3}} />
      {tics}
      <line
        x1={this.props.x}
        x2={this.props.x + this.props.width * maxClockFrac}
        y1={lineY}
        y2={lineY}
        style={{stroke: 'green', strokeWidth: 3}} />
      <circle
        cx={this.props.x + this.props.width * frac}
        cy={lineY}
        r={20}
        style={{fill: this.state.dragging ? 'red' : 'black'}}
        className={this.state.dragging ? 'grabbing' : 'grab'}
        onMouseDown={this.onMouseDown} />
    </g>;
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
      let frac = _.clamp((x - this.props.x) / this.props.width, 0, 1);
      let max = this.max(this.props.controller.clock);
      this.props.controller.setClock(frac * max);
      this.setState({
        x: x,
        y: e.svgY - this.state.offsetY,
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

module.exports = Timeline;
