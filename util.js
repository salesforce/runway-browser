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

let stringCount = (haystack, needle) => {
  let count = 0;
  let i = -1;
  while (true) {
    i = haystack.indexOf(needle, i + 1);
    if (i >= 0) {
      count += 1;
    } else {
      return count;
    }
  }
};

module.exports = {
  getRandomInt: getRandomInt,
  shuffle: shuffle,
  stringCount: stringCount,
};
