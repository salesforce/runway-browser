'use strict';

let _ = require('lodash');

// Represents a source of events that multiple handlers can subscribe to.
class PubSub {
  constructor() {
    this._handlers = [];
  }

  // Call the handlers in order with the arguments provided.
  //
  // If a handler removes one that has not yet been called, it won't be called
  // here or again. If a handler adds another, it won't be called now but will
  // be called in subsequent calls to pub().
  pub(/* arguments */) {
    // The awkwardness here is to give decent semantics to sub()/unsub() calls
    // done in handlers (a simple call to map() doesn't do the trick).
    let results = [];
    _.clone(this._handlers).forEach(handler => {
      if (_.indexOf(this._handlers, handler) >= 0) {
        results.push(handler(...arguments));
      }
    });
    return results;
  }

  // Appends 'cb' to the list of handlers to be called on future,
  // not-yet-started invocations of pub().
  sub(cb) {
    this._handlers.push(cb);
  }

  // Removes the first occurrence of 'cb' from the list of handlers.
  // It will no longer be called by pub().
  unsub(cb) {
    _.pullAt(this._handlers, _.indexOf(this._handlers, cb));
  }
}

module.exports = PubSub;
