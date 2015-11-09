"use strict";

let makeControls = function(module) {
  let rules = module.env.rules;
  return [
    ['deliver token', () => rules['deliverToken'].fire()],
    ['pass token 1', () => rules['passToken'].fire(1)],
    ['pass token 2', () => rules['passToken'].fire(2)],
    ['pass token 3', () => rules['passToken'].fire(3)],
    ['pass token 4', () => rules['passToken'].fire(4)],
    ['pass token 5', () => rules['passToken'].fire(5)],
  ];
};

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

class View {
  constructor(controller, snap, module) {
    this.controller = controller;
    this.snap = snap;
    this.module = module;

    this.numServers = 5;
    this.ring = new Circle(50, 50, 40);

    this.createRing(this.snap);
    this.serverElems = this.createServers(this.snap);
    this.tokenElem = this.createToken(this.snap);
    this.update(0);
  }

  createRing(snap) {
    snap.circle(50, 50, 40)
      .attr({
        id: 'ring',
        fill: 'none',
        stroke: 'black',
      });
  }

  createServers(snap) {
    let createServer = (id) => {
      let frac = (id - 1) / this.numServers;
      let point = this.ring.at(frac);
      let serverGroup = snap.group()
        .addClass('clickable')
        .click(() => {
          console.log('passToken', id);
          this.module.env.rules['passToken'].fire(id);
          this.controller.stateChanged();
        });
      let server = serverGroup.circle(point.x, point.y, 10);
      let text = serverGroup.text(point.x, point.y, id)
        .attr({
          'text-anchor': 'middle'
        });
      text.attr({
        y: point.y + text.getBBox().height / 4,
      });
      return server;
    };
    return Array.from({
      length: this.numServers
    }, (v, i) => createServer(i + 1));
  }

  createToken(snap) {
    return snap.rect(45, 45, 10, 10)
      .attr({
        rx: 2,
        ry: 2,
        id: 'token',
        fill: '#000088',
      })
      .addClass('clickable')
      .click(() => {
        console.log('deliverToken');
        this.module.env.rules['deliverToken'].fire();
        this.controller.stateChanged();
      });
  }

  update(animateSpeed) {
    if (animateSpeed === undefined) {
      animateSpeed = 1000;
    }
    this.updateServers(animateSpeed);
    this.updateToken(animateSpeed);
  }

  updateServers(animateSpeed) {
    let serversVar = this.module.env.getVar('servers');
    this.serverElems.forEach((server, i) => {
      let serverVar = serversVar.index(i + 1);
      let hasToken = (serverVar.hasToken.toString() == 'True');
      server.animate({
        fill: hasToken ? '#00aa00' : '#aa6666',
      }, animateSpeed);
    });
  }

  updateToken(animateSpeed) {
    let tokenVar = this.module.env.getVar('token');
    let frac = tokenVar.match({
        AtServer: (t) => t.at.value - 1,
        InTransit: (t) => {
          if (t.from.value > t.to.value) { // wrap around
            return t.from.value - 0.5;
          } else {
            return (t.from.value + t.to.value) / 2 - 1;
          }
        },
      }) / this.numServers;
    let center = this.ring.at(frac);
    let bbox = this.tokenElem.getBBox();
    this.tokenElem.animate({
      x: center.x - bbox.width / 2,
      y: center.y - bbox.height / 2,
    }, animateSpeed);
  }
}

module.exports = {
  View: View,
  makeControls: makeControls,
};
