'use strict';

let _ = require('lodash');

class PubSub {
  constructor() {
    this._handlers = [];
  }

  pub() {
    // The awkwardness here is to give decent semantics to sub()/unsub() calls
    // done in handlers.
    let results = [];
    _.clone(this._handlers).forEach((handler, i) => {
      if (this._handlers.indexOf(handler) >= 0) {
        results.push(handler(...arguments, i + 1));
      }
    });
    return results;
  }

  sub(cb) {
    this._handlers.push(cb);
    return this._handlers.length;
  }

  unsub(idOrCb) {
    if (_.isFunction(idOrCb)) {
      _.pull(this._handlers, idOrCb);
    } else {
      _.pull(this._handlers, idOrCb - 1);
    }
  }
}

module.exports = PubSub;
