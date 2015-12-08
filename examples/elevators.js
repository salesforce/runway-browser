"use strict";

let numFloors = 6;
let numElevators = 3;
let numPeople = 5;

let range = (b) => Array.from({
    length: b
  }, (v, i) => i);

let fillBBox = (bbox) => {
  bbox.x2 = bbox.x + bbox.w;
  bbox.y2 = bbox.y + bbox.h;
  bbox.cx = bbox.x + bbox.w / 2;
  bbox.cy = bbox.y + bbox.h / 2;
  return bbox;
};

let setupTooltip = (elem, makeHTML) => {
  let tooltipElem = jQuery('#tooltip');
  let show = () => {
    jQuery('.tooltip-inner', tooltipElem).html(makeHTML());
    tooltipElem.show();
    let bbox = elem.getBBox();
    let matrix = elem.node.getScreenCTM().translate(bbox.cx, bbox.y);
    let s = {
      opacity: 1,
      left: Math.max(0, matrix.e + window.scrollX - tooltipElem.width() / 2) + 'px',
      top: Math.max(0, matrix.f + window.scrollY - tooltipElem.height()) + 'px',
    };
    tooltipElem.css(s);
  };
  let hide = () => {
    tooltipElem.hide();
  };
  return elem.hover(show, hide);
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

class Elevator {
  constructor(controller, snap, module, id) {
    this.controller = controller;
    this.snap = snap.group()
      .attr({
        id: `elevator-${id}`
      })
      .addClass('clickable');
    this.module = module;
    this.id = id;

    new BootstrapMenu(`#elevator-${id}`, {
      menuEvent: 'click',
      actions: [
        {
          name: 'move',
          onClick: () => {
            console.log('move', this.id);
            this.module.env.getRule('move').fire(this.id);
            this.controller.stateChanged();
          },
        },
        {
          name: 'change direction',
          onClick: () => {
            console.log('change direction', this.id);
            this.module.env.getRule('changeDirection').fire(this.id);
            this.controller.stateChanged();
          },
        },
      ],
    });

    this.mainElem = this.snap.rect()
      .attr({
        fill: 'white',
        stroke: 'black',
      });
    this.dirArrow = this.snap.line()
      .attr({
        stroke: 'green',
        style: 'marker-end: url(#greentriangle)',
      });
    this.update();

    setupTooltip(this.mainElem, () => this.controller.toHTMLString(this.getVar()));
  }

  getVar() {
    return this.module.env.getVar('elevators').index(this.id);
  }

  update() {
    let evar = this.getVar();
    let floor = elevatorFloor(evar);
    let bbox = debugBBox(this.snap, layout.elevator(floor, this.id));
    this.mainElem.attr({
      x: bbox.x,
      y: bbox.y,
      width: bbox.w,
      height: bbox.h,
    });
    this.dirArrow.attr(evar.lookup('direction').match({
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
    }));
  }
}

let debugBBox;
if (false) {
  debugBBox = (snap, bbox) => {
    snap.rect(bbox.x, bbox.y, bbox.w, bbox.h)
      .attr({
        fill: 'red',
        opacity: 0.2,
      });
    snap.rect(bbox.x, bbox.y, bbox.w, bbox.h)
      .attr({
        fill: 'none',
        stroke: 'green',
      });
    return bbox;
  };
} else { // do nothing
  debugBBox = (snap, bbox) => bbox;
}


class Person {
  constructor(controller, snap, module, id) {
    this.controller = controller;
    this.snap = snap.group()
      .attr({
        id: `person-${id}`
      })
      .addClass('clickable');
    this.module = module;
    this.id = id;

    new BootstrapMenu(`#person-${id}`, {
      menuEvent: 'click',
      actions: [
        {
          name: 'wake',
          onClick: () => {
            console.log('wake', this.id);
            this.module.env.getRule('wake').fire(this.id);
            this.controller.stateChanged();
          },
        },
        {
          name: 'board',
          onClick: () => {
            console.log('board', this.id);
            this.module.env.getRule('board').fire(this.id);
            this.controller.stateChanged();
          },
        },
        {
          name: 'leave',
          onClick: () => {
            console.log('leave', this.id);
            this.module.env.getRule('leave').fire(this.id);
            this.controller.stateChanged();
          },
        },
      ],
    });

    let bbox = debugBBox(this.snap, layout.person(1, id));
    this.mainElem = this.snap.text(bbox.x, bbox.y2, 'z');
    setupTooltip(this.mainElem, () => this.controller.toHTMLString(this.getVar()));
  }

  getVar() {
    return this.module.env.getVar('people').index(this.id);
  }

  update() {
    let pvar = this.getVar();
    let bbox = pvar.match({
      Sleeping: s => {
        this.mainElem.node.innerHTML = 'z';
        return debugBBox(this.snap, layout.person(s.floor, this.id));
      },
      Waiting: w => {
        this.mainElem.node.innerHTML = 'w';
        return debugBBox(this.snap, layout.person(w.floor, this.id));
      },
      Riding: r => {
        this.mainElem.node.innerHTML = 'r';
        let evar = this.module.env.getVar('elevators').index(r.elevator);
        return debugBBox(this.snap,
          layout.elevator(elevatorFloor(evar),
            r.elevator.value));
      },
    });
    this.mainElem.attr({
      x: bbox.x,
      y: bbox.y2
    });
  }
}


class View {
  constructor(controller, snap, module) {
    this.controller = controller;
    this.snap = snap;
    this.module = module;

    this.createFloors(this.snap);
    this.elevators = this.createElevators(this.snap);
    this.people = this.createPeople(this.snap);
  }

  createFloors(snap) {
    snap = snap.group()
      .attr({
        id: 'floors'
      });
    let lowerLine = (id) => {
      let bbox = debugBBox(snap, layout.floor(id));
      snap.line(bbox.x, bbox.y2, bbox.x2, bbox.y2)
        .attr({
          stroke: 'gray',
        });
    };
    range(numFloors).forEach((i) => {
      let id = i + 1;
      lowerLine(id);
      let bbox = debugBBox(snap, layout.label(id));
      snap.text(bbox.x, bbox.y2, id);
    });
    lowerLine(numFloors + 1);
  }

  createElevators(snap) {
    snap = snap.group()
      .attr({
        id: 'elevators'
      });
    return range(numElevators).map((v, i) => new Elevator(this.controller,
        snap,
        this.module,
        i + 1));
  }

  createPeople(snap) {
    snap = snap.group()
      .attr({
        id: 'people'
      });
    return range(numPeople).map((v, i) => new Person(this.controller,
        snap,
        this.module,
        i + 1));
  }

  update() {
    this.elevators.forEach(elevator => elevator.update());
    this.people.forEach(person => person.update());
  }
}

module.exports = View;
