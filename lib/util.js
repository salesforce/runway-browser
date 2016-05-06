/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

'use strict';

class BBox {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.fill();
  }
  fill() {
    this.x2 = this.x + this.w;
    this.y2 = this.y + this.h;
    this.cx = this.x + this.w / 2;
    this.cy = this.y + this.h / 2;
    return this;
  }

  padLabs(amount) {
    return new BBox(this.x + amount, this.y, this.w - amount, this.h);
  }
  padL(frac) {
    return this.padLabs(this.w * frac);
  }
  padRabs(amount) {
    return new BBox(this.x, this.y, this.w - amount, this.h);
  }
  padR(frac) {
    return this.padRabs(this.w * frac);
  }
  padTabs(amount) {
    return new BBox(this.x, this.y + amount, this.w, this.h - amount);
  }
  padT(frac) {
    return this.padTabs(this.h * frac);
  }
  padBabs(amount) {
    return new BBox(this.x, this.y, this.w, this.h - amount);
  }
  padB(frac) {
    return this.padBabs(this.h * frac);
  }

  padLRabs(amount) {
    return new BBox(this.x + amount, this.y, this.w - 2 * amount, this.h);
  }
  padLR(frac) {
    return this.padLRabs(this.w * frac);
  }

  padTBabs(amount) {
    return new BBox(this.x, this.y + amount, this.w, this.h - 2 * amount);
  }
  padTB(frac) {
    return this.padTBabs(this.h * frac);
  }

  pad(frac) {
    return this.padLR(frac).padTB(frac);
  }

  setX(amount) {
    return new BBox(amount, this.y, this.w, this.h);
  }
  setY(amount) {
    return new BBox(this.x, amount, this.w, this.h);
  }
  setW(amount) {
    return new BBox(this.x, this.y, amount, this.h);
  }
  setWR(amount) {
    return new BBox(this.x + this.w - amount, this.y, amount, this.h);
  }
  scaleW(frac) {
    return this.setW(this.w * frac);
  }
  scaleWR(frac) {
    return this.setWR(this.w * frac);
  }
  setH(amount) {
    return new BBox(this.x, this.y, this.w, amount);
  }
  setHB(amount) {
    return new BBox(this.x, this.y + this.h - amount, this.w, amount);
  }
  scaleH(frac) {
    return this.setH(this.h * frac);
  }
  scaleHB(frac) {
    return this.setHB(this.h * frac);
  }
  squareMin() {
    let wh = Math.min(this.w, this.h);
    return new BBox(this.x, this.y, wh, wh);
  }
  squareMax() {
    let wh = Math.max(this.w, this.h);
    return new BBox(this.x, this.y, wh, wh);
  }

  sliceH(pieces, start, stop) {
    if (stop === undefined) {
      stop = start;
    }
    let pieceWidth = this.w / pieces;
    return new BBox(this.x + pieceWidth * start, this.y, pieceWidth * (stop + 1 - start), this.h);
  }
  sliceV(pieces, start, stop) {
    if (stop === undefined) {
      stop = start;
    }
    let pieceHeight = this.h / pieces;
    return new BBox(this.x, this.y + pieceHeight * start, this.w, pieceHeight * (stop + 1 - start));
  }

  maxW(amount) {
    return this.setW(Math.min(this.w, amount));
  }
  maxH(amount) {
    return this.setH(Math.min(this.h, amount));
  }

}

let fillBBox = (bbox) => {
  bbox.x2 = bbox.x + bbox.w;
  bbox.y2 = bbox.y + bbox.h;
  bbox.cx = bbox.x + bbox.w / 2;
  bbox.cy = bbox.y + bbox.h / 2;
  return bbox;
};

let fontSize = bbox => {
  return Math.min(
    bbox.x2 - bbox.x,
    bbox.y2 - bbox.y);
};

module.exports = {
  fillBBox: fillBBox,
  fontSize: fontSize,
  BBox: BBox,
};
