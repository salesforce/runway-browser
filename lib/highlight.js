/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

let grammar = require('language-runway/grammars/runway.json');
require('./highlight.less');

grammar.patterns.forEach(pattern => {
  if (pattern.begin !== undefined && pattern.end !== undefined) {
    pattern.match = new RegExp(pattern.begin + '.*' + pattern.end);
  } else if (pattern.match !== undefined) {
    pattern.match = new RegExp(pattern.match);
  }
});

let leftPad = (number,  digits) => {
  let s = number.toString();
  while (s.length < digits) {
    s = ' ' + s;
  }
  return s;
};


let findBestMatch = (line, patterns) => {
  let bestMatch = null;
  patterns = patterns.filter(pattern => {

    if (pattern.match !== undefined) {
      let result = line.match(pattern.match);
      if (result !== null) {
        if (bestMatch === null ||
            result.index < bestMatch.index ||
            (result.index == bestMatch.index &&
             result.length > bestMatch.priority)) {
          bestMatch = {
            index: result.index,
            priority: result[0].length,
            matched: result[0],
            pattern: pattern,
            multiline: false,
          };
        }
        return true;
      } // pattern.match matched
    } // single-line match

    if (pattern.begin !== undefined && pattern.end !== undefined) {
      let result = line.match(pattern.begin);
      if (result !== null) {
        if (bestMatch === null ||
            result.index < bestMatch.index) {
          bestMatch = {
            index: result.index,
            priority: Number.MAX_VALUE,
            matched: line.slice(result.index),
            multiline: true,
            pattern: pattern,
          };
        }
        return true;
      } // pattern.begin matched
    } // multi-line match

    return false;
  });

  return {
    match: bestMatch,
    patterns: patterns,
  };
};

let continueMultiline = (line, pattern) => {
  let result = line.match(pattern.end);
  let match;
  if (result === null) {
    match = {
      index: 0,
      matched: line,
      pattern: pattern,
      multiline: true,
    };
  } else {
    match = {
      index: 0,
      matched: line.slice(0, result.index + result[0].length),
      pattern: pattern,
      multiline: false,
    };
  }
  return {
    match: match,
  };
};

module.exports = function(input) {
  let output = document.createElement('pre');
  output.className = 'editor';
  let code = document.createElement('code');
  output.appendChild(code);

  let lines = input.split('\n');
  let lineCountDigits = lines.length.toString().length;
  let multiline = null;
  lines.forEach((line, lineCount) => {
    lineCount += 1;
    let lineDiv = document.createElement('div');
    lineDiv.className = 'line';
    code.appendChild(lineDiv);

    let gutter = document.createElement('span');
    gutter.className = 'gutter';
    lineDiv.appendChild(gutter);
    let lineNumberSpan = document.createElement('span');
    lineNumberSpan.className = 'line-number';
    let lineCountStr = leftPad(lineCount, lineCountDigits) + ' ';
    lineNumberSpan.appendChild(document.createTextNode(lineCountStr));
    gutter.appendChild(lineNumberSpan);

    let lineSpan = document.createElement('span');
    lineSpan.className = 'source runway';
    lineDiv.appendChild(lineSpan);

    let patterns = Array.from(grammar.patterns);
    while (line !== '') {
      let result;
      if (multiline) {
        result = continueMultiline(line, multiline);
      } else {
        result = findBestMatch(line, patterns);
        if (result.match === null) {
          lineSpan.appendChild(document.createTextNode(line));
          line = '';
          multiline = null;
          break;
        }
      }

      // before match
      lineSpan.appendChild(document.createTextNode(line.slice(0, result.match.index)));
      // match
      let matchSpan = document.createElement('span');
      matchSpan.className = result.match.pattern.name.replace('.', ' ');
      matchSpan.appendChild(document.createTextNode(result.match.matched));
      lineSpan.appendChild(matchSpan);
      // after match: continue looping
      line = line.slice(result.match.index + result.match.matched.length);
      patterns = result.patterns;
      if (result.match.multiline) {
        multiline = result.match.pattern;
      } else {
        multiline = null;
      }
    }
    lineSpan.appendChild(document.createTextNode('\n'));
  });
  return output;
};
