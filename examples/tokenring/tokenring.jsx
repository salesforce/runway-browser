"use strict";

let React = require('React');
let ReactDOM = require('ReactDOM');
let jQuery = require('jquery');
let Tooltip = require('Tooltip');
let Util = require('Util');

// Calculates where points on the circumference of a circle lie.
class Circle {
  constructor(cx, cy, r) {
    this.cx = cx;
    this.cy = cy;
    this.r = r;
  }
  at(frac) {
    let radian = frac * 2 * Math.PI;
    return {
      x: this.cx + this.r * Math.sin(radian),
      y: this.cy - this.r * Math.cos(radian),
    };
  }
}


let View = function(controller, svg, module) {

let model = module.env;
let tooltip = new Tooltip(jQuery('#tooltip'));

let numServers = 5;
let ring = new Circle(50, 50, 40);

let TokenRingView = React.createClass({
  render: function() {
    let servers = Util.range(numServers).map(i => {
      let id = i + 1;
      let frac = i / numServers;
      let point = ring.at(frac);
      let serverVar = model.getVar('servers').index(id);
      let hasToken = (serverVar.hasToken.toString() == 'True');
      return <g key={id} className="clickable"
        onClick={() => controller.tryStateChange(() => {
          console.log('passToken', id);
          model.getRule('passToken').fire(id);
        })}>
          <circle cx={point.x} cy={point.y} r={10}
            style={{fill: hasToken ? '#00aa00' : '#aa6666', stroke: 'black'}} />
          <text x={point.x} y={point.y + 4}
            style={{textAnchor: 'middle'}}>
            {id}
          </text>
        </g>;
    });
    
    let token = (() => {
      let frac = model.getVar('token').match({
          AtServer: t => t.at.value - 1,
          InTransit: t => {
            if (t.from.value > t.to.value) { // wrap around
              return t.from.value - 0.5;
            } else {
              return (t.from.value + t.to.value) / 2 - 1;
            }
          },
        }) / numServers;
      let center = ring.at(frac);
      let width = 10;
      let height = 10;
      return <rect
        x={center.x - width/2}
        y={center.y - height/2}
        width={width}
        height={height}
        rx={2}
        ry={2}
        id="token"
        style={{fill: '#000088'}}
        className="clickable"
        onClick={() => controller.tryStateChange(() => {
          console.log('deliverToken');
          model.getRule('deliverToken').fire();
        })} />;
    })();


    return <g>
        <circle id="ring" style={{fill: 'none', stroke: 'black'}}
          cx={50} cy={50} r={40} />
        {servers}
        {token}
      </g>;
  },

});

let reactComponent = ReactDOM.render(<TokenRingView />, svg);

return {
  update: function() {
    // trigger a render
    reactComponent.setState({}, () => {
      tooltip.update();
      console.log('rendered');
    });
  }
};

}; // View

module.exports = View;
