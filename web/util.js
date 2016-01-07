"use strict";

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

let fontSize = bbox => {
  return Math.min(
    bbox.x2 - bbox.x,
    bbox.y2 - bbox.y);
};

module.exports = {
  range: range,
  fillBBox: fillBBox,
  fontSize: fontSize,
};
