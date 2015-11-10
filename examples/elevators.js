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

class Elevator {
  constructor(controller, snap, module, id) {
    this.controller = controller;
    this.snap = snap.group()
      .attr({id: `elevator-${id}`});
    this.module = module;
    this.id = id;

    let bbox = debugBBox(this.snap, layout.elevator(1, id));
    this.mainElem = this.snap.rect(bbox.x, bbox.y, bbox.w, bbox.h)
      .attr({
        fill: 'none',
        stroke: 'black',
      });
    this.upArrow = this.snap.line(bbox.cx,
      bbox.y,
      bbox.cx,
      bbox.y - 4)
      .attr({
        stroke: 'green',
        style: 'marker-end: url(#greentriangle)',
      });
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
      .attr({id: `person-${id}`});
    this.module = module;
    this.id = id;

    let bbox = debugBBox(this.snap, layout.person(1, id));
    this.mainElem = this.snap.text(bbox.x, bbox.y2, 'z');
  }
}


class View {
  constructor(controller, snap, module) {
    this.controller = controller;
    this.snap = snap;
    this.module = module;

    this.createFloors(this.snap);
    this.elevatorElems = this.createElevators(this.snap);
    this.peopleElems = this.createPeople(this.snap);
  }

  createFloors(snap) {
    snap = snap.group()
      .attr({id: 'floors'});
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
      .attr({id: 'elevators'});
    return range(numElevators).map((v, i) =>
      new Elevator(this.controller,
        snap,
        this.module,
        i + 1));
  }

  createPeople(snap) {
    snap = snap.group()
      .attr({id: 'people'});
    return range(numPeople).map((v, i) =>
      new Person(this.controller,
        snap,
        this.module,
        i + 1));
  }

  update() {
  }
}

module.exports = View;
