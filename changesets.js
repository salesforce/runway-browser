"use strict";

let _ = require('lodash');

// Returns sorted array of paths that differ
let compareJSON = (state1, state2) => {
  let same = [];
  let different = [''];
  let compare = (state1, state2) => {
    //console.log(JSON.stringify(state1, null, 2));
    //console.log(JSON.stringify(state2, null, 2));
    if (state1 instanceof Array && state2 instanceof Array) {
      return compareCollection(state1, state2);
    }
    if (state1 instanceof Object && state2 instanceof Object) {
      if ('tag' in state1 && 'tag' in state2) {
        return compareEither(state1, state2);
      } else {
        return compareRecord(state1, state2);
      }
    } else {
      // deep equality is sufficient for numbers and eithers
      return _.isEqual(state1, state2) ? same : different;
    }
  };
  let compareCollection = (state1, state2) => {
      if (state1.length == state2.length &&
          _.isEqual(state1.map(_.head),
                    state2.map(_.head))) {
        return _.flatMap(_.zip(state1, state2), (kv12) => {
          let kv1 = kv12[0];
          let kv2 = kv12[1];
          return _.map(compare(kv1[1], kv2[1]),
                       change => `[${kv1[0]}]${change}`);
        });
      } else {
        return different;
      }
  };
  let compareEither = (state1, state2) => {
    if (state1.tag === state2.tag) {
      return _.map(compareRecord(state1.fields, state2.fields),
                   change => `!${state1.tag}${change}`);
    } else {
      return different;
    }
  };
  let compareRecord = (state1, state2) => {
    let keys1 = Object.keys(state1).sort();
    let keys2 = Object.keys(state2).sort();
    if (_.isEqual(keys1, keys2)) {
      return _.flatMap(keys1, key =>
        _.map(compare(state1[key], state2[key]),
              change => `.${key}${change}`));
    } else {
      return different;
    }
  };
  let compareGlobals = (state1, state2) => {
    let keys = _.union(_.keys(state1), _.keys(state2)).sort();
    return _.flatMap(keys, key => {
      if (key in state1 && key in state2) {
        return _.map(compare(state1[key], state2[key]),
                     change => `${key}${change}`);
      } else {
        return key;
      }
    });
  };
  return compareGlobals(state1, state2);
};

let affected = (changeset, readset) => {
  if (_.isString(changeset)) {
    changeset = [changeset];
  }
  if (_.isString(readset)) {
    readset = [readset];
  }
  // Could try _.sortedIndex to speed this up, but it's not clear that
  // would be faster for the small arrays expected here.
  for (let read of readset) {
    for (let change of changeset) {
      if (change.startsWith(read) ||
          read.startsWith(change)) {
        return true;
      }
    }
  }
  return false;
};

let empty = changeset => {
  if ('length' in changeset) { // Array
    return changeset.length === 0;
  } else if ('size' in changeset) { // Set
    return changeset.size === 0;
  } else { // hmm
    console.error(`Don't know what ${changeset} is`);
    return false;
  }
};

let union = (cs1, cs2) => {
  let changes = Array.from(cs1).concat(Array.from(cs2));
  changes.sort();
  return _.uniq(changes);
};

module.exports = {
  compareJSON: compareJSON,
  affected: affected,
  empty: empty,
  union: union,
};
