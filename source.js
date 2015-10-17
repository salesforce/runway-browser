"use strict";

// Describes a character range of an input.
// Most nodes in the AST have one of these hanging off of them named 'source'.
// This can be used to provide meaningful error messages, tying back an
// expression to its location in the original source file.
class Source {
  constructor(startchar, endchar) {
    this.input = null;
    this.startchar = startchar;
    this.endchar = endchar;
  }

  setInput(input) {
    this.input = input;
  }

  toString() {
    if (this.input === null) {
      return `chars ${this.startchar}-${this.endchar}`;
    } else {
      let start = this.input.lookup(this.startchar);
      let end = this.input.lookup(this.endchar);
      return `${this.input.filename}: line ${start.line}, col ${start.col} to line ${end.line}, col ${end.col}`;
    }
  }
}

module.exports = Source;
