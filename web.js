"use strict";

let compiler = require('./compiler.js');
let Environment = require('./environment.js');
let Input = require('./input.js');

let preludeText = require('./prelude.model');
let jQuery = require('./node_modules/jquery/dist/jquery.min.js');

let prelude = compiler.loadPrelude(preludeText);

let meval = (text) => {
  let env = new Environment(prelude.env);
  let module = compiler.load(new Input('eval', text), env);
  module.ast.execute();
};

let fetchRemoteFile = (filename) => new Promise((resolve, reject) => {
    jQuery.get(filename).then((text) => {
      resolve(new Input(filename, text));
    });
  });


window.compiler = compiler;
window.Environment = Environment;
window.Input = Input;
window.meval = meval;
window.jQuery = jQuery;

meval('print 3 * 3;');

let controls = [
  ['deliver token', (rules) => rules['deliverToken'].fire()],
  ['pass token 1', (rules) => rules['passToken'].fire(1)],
  ['pass token 2', (rules) => rules['passToken'].fire(2)],
  ['pass token 3', (rules) => rules['passToken'].fire(3)],
  ['pass token 4', (rules) => rules['passToken'].fire(4)],
  ['pass token 5', (rules) => rules['passToken'].fire(5)],
];

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

let ring = new Circle(50, 50, 40);

// only called after page has loaded
let updateStateDisplay = (module, servers) => {
  let output = Array.from(module.env.vars).map((kv) => `${kv[0]}: ${kv[1]}`).join('\n');
  jQuery('#state').text(output);
  let token = module.env.getVar('token');
  window.token = token;
  let moveToken = (loc) => {
    jQuery('#token')
      .attr('x', loc.x - 5)
      .attr('y', loc.y - 5);
  };
  if (token.varianttype.name == 'AtServer') {
    let atServer = token.fields.at.value;
    moveToken(ring.at((atServer - 1) / 5));
  } else { // InTransit
    let fromServer = token.fields.from.value;
    let toServer = token.fields.to.value;
    let newLoc = ring.at(((fromServer + toServer) / 2 - 1) / 5);
    if (fromServer > toServer) { // wrapped
      newLoc = ring.at((fromServer - 0.5) / 5);
    }
    moveToken(newLoc);
  }
  var serversVar = module.env.getVar('servers');
  servers.forEach((server, i) => {
    let hasToken = (serversVar.index(i + 1).hasToken.varianttype.name == 'True');
    if (hasToken) {
      server.css('fill', '#00aa00');
    } else {
      server.css('fill', '#aa6666');
    }
  });
};

let makeSVG = (tag) => {
  let ns = 'http://www.w3.org/2000/svg';
  return jQuery(document.createElementNS(ns, tag));
};

let createServers = (tpl, count) => {
  let createServer = (id) => {
    let frac = (id - 1) / count;
    let point = ring.at(frac);
    let server = tpl
      .clone()
      .removeAttr('id')
      .attr('cx', point.x)
      .attr('cy', point.y);
    tpl.after(server);
    server.after(makeSVG('text')
      .text(id)
      .attr(point));
    return server;
  };
  let ids = Array.from({
    length: count
  }, (v, k) => (k + 1));
  let servers = ids.map((id) => createServer(id));
  tpl.remove();
  return servers;
};


let pageLoaded = new Promise((resolve, reject) => {
  jQuery(window).load(resolve);
});

Promise.all([
  fetchRemoteFile('tokenring.model'),
  pageLoaded,
]).then((results) => {
  let input = results[0];
  jQuery('#code').text(input.getText());
  let env = new Environment(prelude.env);
  let module = compiler.load(input, env);
  module.ast.execute();
  window.module = module;
  let servers = createServers(jQuery('#server-tpl'), 5);
  let redraw = () => updateStateDisplay(module, servers);
  redraw();
  controls.forEach((kv) => {
    jQuery('#controls').append(
      jQuery('<li></li>').append(
        jQuery('<a href="#"></a>')
          .text(kv[0])
          .click(() => {
            kv[1](module.env.rules);
            redraw();
            return false;
          })));
  });
  servers.forEach((server, i) => {
    server.click(() => {
      console.log('passToken', i + 1);
      module.env.rules['passToken'].fire(i + 1);
      redraw();
      return false;
    });
  });
  jQuery('#token').click(() => {
    console.log('deliverToken');
    module.env.rules['deliverToken'].fire();
    redraw();
    return false;
  });
});
