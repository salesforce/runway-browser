"use strict";

let numFloors = 6;
let numElevators = 3;
let numPeople = 5;

let range = (b) => Array.from({
    length: b
  }, (v, i) => i);

class Tooltip {
  constructor(elem) {
    this.tooltipElem = elem;
    this.tooltipInner = jQuery('.tooltip-inner', this.tooltipElem);
    this.node = undefined;
    this.makeHTML = undefined;
  }
  update() {
    if (this.node === undefined) {
      return;
    }
    this.tooltipInner.html(this.makeHTML());
    let bbox = this.node.getBBox();
    let matrix = this.node.getScreenCTM().translate(bbox.x + bbox.width/2, bbox.y);
    let s = {
      opacity: 1,
      left: Math.max(0, matrix.e + window.scrollX - this.tooltipElem.width() / 2) + 'px',
      top: Math.max(0, matrix.f + window.scrollY - this.tooltipElem.height()) + 'px',
    };
    this.tooltipElem.css(s);
  }
  set(node, makeHTML) {
    this.node = node;
    this.makeHTML = makeHTML;
    this.tooltipElem.show();
    this.update();
  }
  clear() {
    this.node = undefined;
    this.makeHTML = undefined;
    this.tooltipInner.html('');
    this.tooltipElem.hide();
  }
}

let fillBBox = (bbox) => {
  bbox.x2 = bbox.x + bbox.w;
  bbox.y2 = bbox.y + bbox.h;
  bbox.cx = bbox.x + bbox.w / 2;
  bbox.cy = bbox.y + bbox.h / 2;
  return bbox;
};

let layout = {
  floor: floorId => {
    return fillBBox({
      x: 2,
      y: 5 + 15 * (numFloors - floorId),
      w: 96,
      h: 15,
    });
  },

  label: floorId => {
    let floor = layout.floor(floorId);
    return fillBBox({
      x: 5,
      y: floor.y + 2,
      w: 8,
      h: floor.h - 4,
    });
  },

  elevators: floorId => {
    let floor = layout.floor(floorId);
    let label = layout.label(floorId);
    return fillBBox({
      x: label.x2,
      y: floor.y + 2,
      w: numElevators * 15,
      h: floor.h - 4,
    });
  },

  elevator: (floorId, id) => {
    let elevators = layout.elevators(floorId);
    return fillBBox({
      x: elevators.x + 2.5 + (id - 1) * 15,
      y: elevators.y,
      w: 10,
      h: elevators.h,
    });
  },

  people: floorId => {
    let floor = layout.floor(floorId);
    let elevators = layout.elevators(floorId);
    return fillBBox({
      x: elevators.x2,
      y: floor.y + 2,
      w: floor.x2 - elevators.x2,
      h: floor.h - 4,
    });
  },

  person: (floorId, count) => {
    let people = layout.people(floorId);
    return fillBBox({
      x: people.x + (count - 1) * 8,
      y: people.y,
      w: 8,
      h: people.h,
    });
  },
};

let elevatorFloor = (evar) => evar.lookup('location').match({
    AtFloor: a => a.at.value,
    Between: b => evar.lookup('direction').match({
        'Up': () => b.next.value - 0.5,
        'Down': () => b.next.value + 0.5,
      }),
  });

let Elevator = React.createClass({

  componentDidMount: function() {
    let id = this.props.elevatorId;
    this.menu = new BootstrapMenu(`#elevator-${id}`, {
      menuEvent: 'click',
      actions: [
        {
          name: 'move',
          onClick: () => {
            console.log('move', id);
            this.props.model.getRule('move').fire(id);
            this.props.controller.stateChanged();
          },
        },
        {
          name: 'change direction',
          onClick: () => {
            console.log('change direction', id);
            this.props.model.getRule('changeDirection').fire(id);
            this.props.controller.stateChanged();
          },
        },
      ],
    });
  },

  componentWillUnmount: function() {
    this.menu.destroy();
  },

  onMouseOver: function(evt) {
    this.props.tooltip.set(evt.target, () => {
      let id = this.props.elevatorId;
      let evar = this.props.model.getVar('elevators').index(id);
      return this.props.controller.toHTMLString(evar);
    });
  },

  onMouseOut: function(evt) {
    this.props.tooltip.clear();
  },

  render: function() {
    let id = this.props.elevatorId;
    let evar = this.props.model.getVar('elevators').index(id);
    let floor = elevatorFloor(evar);
    let bbox = layout.elevator(floor, id);
    let arrow = evar.lookup('direction').match({
      Up: () => ({
          x1: bbox.cx,
          x2: bbox.cx,
          y1: bbox.y,
          y2: bbox.y - 4,
      }),
      Down: () => ({
          x1: bbox.cx,
          x2: bbox.cx,
          y1: bbox.y2,
          y2: bbox.y2 + 4,
      }),
    });
    return <g
      id={'elevator-' + id}
      className="clickable"
      onMouseOver={this.onMouseOver}
      onMouseOut={this.onMouseOut}
      >
      <rect
        style={{fill: 'white', stroke: 'black'}}
        x={bbox.x} y={bbox.y}
        width={bbox.w} height={bbox.h}
        />
      <line style={{
          stroke: 'green',
          markerEnd: 'url(#greentriangle)',
        }}
        x1={arrow.x1} y1={arrow.y1}
        x2={arrow.x2} y2={arrow.y2} />
    </g>;
  },
});

let Person = React.createClass({

  componentDidMount: function() {
    let id = this.props.personId;
    this.menu = new BootstrapMenu(`#person-${id}`, {
      menuEvent: 'click',
      actions: [
        {
          name: 'wake',
          onClick: () => {
            console.log('wake', id);
            this.props.model.getRule('wake').fire(id);
            this.props.controller.stateChanged();
          },
        },
        {
          name: 'board',
          onClick: () => {
            console.log('board', id);
            this.props.model.getRule('board').fire(id);
            this.props.controller.stateChanged();
          },
        },
        {
          name: 'leave',
          onClick: () => {
            console.log('leave', id);
            this.props.model.getRule('leave').fire(id);
            this.props.controller.stateChanged();
          },
        },
      ],
    });
  },

  componentWillUnmount: function() {
    this.menu.destroy();
  },

  onMouseOver: function(evt) {
    this.props.tooltip.set(evt.target, () => {
      let id = this.props.personId;
      let pvar = this.props.model.getVar('people').index(id);
      return this.props.controller.toHTMLString(pvar);
    });
  },

  onMouseOut: function(evt) {
    this.props.tooltip.clear();
  },

  render: function() {
    let id = this.props.personId;
    let pvar = this.props.model.getVar('people').index(id);
    let text;
    let bbox = pvar.match({
      Sleeping: s => {
        text = 'z';
        return layout.person(s.floor, id);
      },
      Waiting: w => {
        text = 'w';
        return layout.person(w.floor, id);
      },
      Riding: r => {
        text = 'r';
        let evar = this.props.model.getVar('elevators').index(r.elevator);
        let bbox = layout.elevator(elevatorFloor(evar),
            r.elevator.value);
        bbox.x += 3 * (evar.lookup('riders').indexOf(id) - 2);
        return bbox;
      },
    });

    return <g id={'person-' + id}
      className='clickable'
      onMouseOver={this.onMouseOver}
      onMouseOut={this.onMouseOut}>
        <text x={bbox.x} y={bbox.y2}>{text}</text>
    </g>;
  },
});

let Background = React.createClass({
  render: function() {
    let lowerLine = (id) => {
      let bbox = layout.floor(id);
      return <line key={id}
        x1={bbox.x} y1={bbox.y2}
        x2={bbox.x2} y2={bbox.y2}
        style={{stroke: 'gray'}} />;
    };
    let lines = range(this.props.floors + 1).map(i => lowerLine(i + 1));
    let labels = range(this.props.floors).map(i => {
      let id = i + 1;
      let bbox = layout.label(id);
      return <text key={id} x={bbox.x} y={bbox.y2}>
          {id}
        </text>;
    });
    return <g id="floors">
      {lines}
      {labels}
    </g>;
  },
});

let makeElevatorView = function(model) {
  let ElevatorView = React.createClass({
    getInitialState: function() {
      return {
        model: model,
      };
    },

    render: function() {
      let elevators = range(numElevators).map(i => (
        <Elevator key={i + 1} elevatorId={i + 1}
          controller={this.props.controller}
          model={this.state.model} 
          tooltip={this.props.tooltip} />
      ));
      let people = range(numPeople).map(i => (
        <Person key={i + 1} personId={i + 1}
          controller={this.props.controller}
          model={this.state.model}
          tooltip={this.props.tooltip} />
      ));
      return <g>
        <Background floors={numFloors} />
        <g id="elevators">{elevators}</g>
        <g id="people">{people}</g>
      </g>;
    },
  });
  return ElevatorView;
};

class View {
  constructor(controller, svg, module) {
    this.controller = controller;
    this.module = module;
    this.tooltip = new Tooltip(jQuery('#tooltip'));

    let ElevatorView = makeElevatorView(this.module.env);
    this.reactComponent = ReactDOM.render(
      <ElevatorView controller={this.controller} tooltip={this.tooltip} />,
      svg);
  }

  update() {
    // trigger a render
    this.reactComponent.setState({}, () => {
      this.tooltip.update();
      console.log('rendered');
    });
  }
}

module.exports = View;
