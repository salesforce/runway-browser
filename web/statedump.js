"use strict";

let jQuery = require('jquery');

// Fill an HTML element with a visual representation of a model value.
let toHTML = function(value, outer) {
  let helper = function(value, outer, horizontal, depth) {
    let $ = jQuery;
    let colors = [ // from colorbrewer2.org
      //'#8c510a',
      '#d8b365',
      '#f6e8c3',
      '#f5f5f5',
      '#c7eae5',
      '#5ab4ac',
      '#01665e',
    ];
    let color = colors[depth % colors.length];
    let style = table => table
        .css('border', '1px solid black')
        .css('padding', '5px')
        .css('background', color);
    if (value instanceof Array) {
      let table = style($('<table></table>'));
      if (horizontal) {
        let row = $('<tr></tr>');
        value.forEach(v => row
            .append(helper(v, $('<td></td>'), false, depth + 1)));
        table.append(row);
      } else {
        value.forEach(v => table
            .append($('<tr></tr>')
              .append(helper(v, $('<td></td>'), true, depth + 1))));
      }
      outer.append(table);
    } else if (typeof value == 'object' && 'tag' in value) {
      let table = style($('<table></table>'));
      table.append($('<tr></tr>')
        .append($('<th></th>')
          .attr('colspan', 2)
          .text(value.tag)));
      for (let field in value.fields) {
        table.append($('<tr></tr>')
          .append($('<td></td>').text(field))
          .append(helper(value.fields[field], $('<td></td>'), true, depth + 1)));
      }
      outer.append(table);
    } else if (typeof value == 'object') {
      let table = style($('<table></table>'));
      for (let field in value) {
        table.append($('<tr></tr>')
          .append($('<td></td>').text(field))
          .append(helper(value[field], $('<td></td>'), true, depth + 1)));
      }
      outer.append(table);
    } else if (typeof value == 'string') {
      outer.text(value);
    } else {
      outer.text(JSON.stringify(value, null, 2));
    }
    return outer;
  };
  return helper(value.toJSON(), outer, true, 0);
};
let toHTMLString = value => toHTML(value, jQuery('<div></div>')).html();

module.exports = {
  toHTML: toHTML,
  toHTMLString: toHTMLString,
};
