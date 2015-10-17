"use strict";

let fs = require('fs');

// Holds the textual input to the compiler that has been read from a particular file.
class Input {
  // filename: where the text comes from. For interactive input, make up something.
  // text is optional: if not given, will read from the filename on disk.
  constructor(filename, text) {
    this.filename = filename;
    if (text === undefined) {
      text = fs.readFileSync(filename).toString();
    }
    this.getText = () => text; // don't store directly so as to avoid printing on every json dump
  }

  // Given a character offset into the entire file, determine the line number,
  // column, etc.
  // TODO: test when offset points to a newline character.
  lookup(charOffset) {
    let lineno = 1; // line number
    let lineStartOffset = 0;
    let lineEndOffset = -1;
    while (true) {
      lineEndOffset = this.getText().indexOf("\n", lineStartOffset);
      if (lineEndOffset == -1 || lineEndOffset > charOffset) {
        break;
      }
      lineStartOffset = lineEndOffset + 1;
      lineno += 1;
    }
    return {
      line: lineno,
      col: charOffset - lineStartOffset + 1,
      lineStartOffset: lineStartOffset,
      lineEndOffset: lineEndOffset,
      charOffset: charOffset,
    };
  }

  // Given a lookup result, print out the containing line and an arrow pointing
  // to the character in question.
  highlight(lookup) {
    let line = this.getText().slice(lookup.lineStartOffset, lookup.lineEndOffset);
    let indent = ' '.repeat(lookup.col - 1);
    return `${line}
${indent}^`;
  }

}

module.exports = Input;
