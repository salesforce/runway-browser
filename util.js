"use strict";

// getRandomInt is based on:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
//
// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
let getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min;
};

let shuffle = (array) => {
  // at every loop iteration, we'll decide what belongs at array[i].
  for (let i = 0; i < array.length; ++i) {
    let j = getRandomInt(i, array.length);
    let tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
};

let range = (start, stop) => {
  if (stop === undefined) {
    stop = start;
    start = 0;
  }
  return Array.from({
    length: stop - start,
  }, (v, i) => (start + i));
}

module.exports = {
  getRandomInt: getRandomInt,
  shuffle: shuffle,
  range: range,
};
