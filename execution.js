'use strict';

class Execution {
  constructor(parent, startIndex, firstEvent) {
    // invariant: null or Execution
    this._parent = parent;
    // invariant: If _parent is null, startIndex is 0. Otherwise, ancestors
    // contain at least _startIndex > 0 number of events. 
    this._startIndex = startIndex;
    // invariant: non-empty
    this._events = [firstEvent];
  }

  size() {
    return this._startIndex + this._events.length;
  }

  forkStart() {
    return new Cursor(this, this._startIndex);
  }

  last() {
    return new Cursor(this, this._startIndex + this._events.length - 1);
  }

  map(cb, _endIndex) {
    if (_endIndex === undefined) {
      _endIndex = this._startIndex + this._events.length - 1;
    }
    let result = [];
    if (this._startIndex > 0) {
      result = this._parent.map(cb,
        Math.min(this._startIndex - 1, _endIndex));
    }
    for (let i = this._startIndex; i <= _endIndex; ++i) {
      result.push(cb(this._events[i - this._startIndex], i));
    }
    return result;
  }

  
  // Like preceding() but returns index.
  _precedingIndex(leq, endIndex) {
    if (endIndex >= this._startIndex && leq(this._events[0])) { // here
      let low = 0;
      let high = endIndex - this._startIndex;
      let mid = high; // check high end first, pretty common case
      while (low < high) {
        if (leq(this._events[mid])) {
          low = mid;
        } else {
          high = mid - 1;
        }
        mid = low + Math.ceil((high - low) / 2);
      }
      return this._startIndex + low;
    } else {
      if (this._startIndex > 0) { // parent
        return this._parent._precedingIndex(leq,
          Math.min(this._startIndex - 1, endIndex));
      } else { // invalid
        return undefined;
      }
    }
  }

  // Binary-ish search to find an event in the execution.
  // 'leq' should be a function returning true for all events earlier or equal
  // to the one being searched for, false for all later events.
  // Returns the latest event for which 'leq' returns true.
  preceding(leq) {
    let index = this._precedingIndex(leq, this._startIndex + this._events.length - 1);
    if (index === undefined) {
      return undefined;
    } else {
      return new Cursor(this, index);
    }
  }

  _at(index) {
    if (index < this._startIndex) {
      return this._parent._at(index);
    } else {
      return this._events[index - this._startIndex];
    }
  }

}

class RootExecution extends Execution {
  constructor(start) {
    super(null, 0, start);
  }
}

class Cursor {
  constructor(execution, index) {
    this.execution = execution;
    this._index = index;
  }

  index() {
    return this._index;
  }

  equals(other) {
    return (this.execution === other.execution &&
      this._index === other._index);
  }

  previous() {
    if (this.execution._at(this._index - 1) !== undefined) {
      return new Cursor(this.execution, this._index - 1);
    } else {
      return undefined;
    }
  }

  next() {
    if (this.execution._at(this._index + 1) !== undefined) {
      return new Cursor(this.execution, this._index + 1);
    } else {
      return undefined;
    }
  }

  parent() {
    if (this.execution._parent === null) {
      return null;
    } else {
      return new Cursor(this.execution._parent,
        this.execution._startIndex - 1);
    }
  }

  getEvent() {
    return this.execution._at(this._index);
  }

  addEvent(event) {
    let e = this.execution;
    if (this._index < this.execution.last()._index) { // fork
      e = new Execution(this.execution, this._index + 1, event);
    } else { // add to current execution
      e._events.push(event);
    }
    return new Cursor(e, this._index + 1);
  }

  map(cb) {
    return this.execution.map(cb, this._index);
  }
}

module.exports = RootExecution;
