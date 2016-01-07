"use strict";

let jQuery = require('jquery');

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

module.exports = Tooltip;
