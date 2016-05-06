/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

'use strict';

let d3 = require('d3');
let _ = require('lodash');

let chronological = {
  type: 'chronological',
  cumulative: false,
  fn: d => d.start
};

class Graph {
  constructor(controller, elem, stack) {
    this.controller = controller;
    this.stack = stack;
    this.data = [];
    this.sortOrder = chronological;

    d3.select('head').append('style')
        .attr('type', 'text/css')
        .text(`
          .axis path,
          .axis line {
            fill: none;
            stroke: #000;
            shape-rendering: crispEdges;
          }

          .line {
            fill: none;
            stroke: steelblue;
            stroke-width: 1.5px;
          }
        `);

    this.margin = {top: 20, right: 20, bottom: 30, left: 50};
    this.width = 500 - this.margin.left - this.margin.right,
    this.height = 400 - this.margin.top - this.margin.bottom;

    this.x = d3.scale.linear()
        .range([0, this.width]);
    this.barWidth = this.x(1) - this.x(0);

    this.y = d3.scale.linear()
        .range([this.height, 0]);
    this.y0 = this.y(0);

    this.xAxis = d3.svg.axis()
        .scale(this.x)
        .orient('bottom');

    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient('left');

    this.color = d3.scale.category10()
      .domain(this.stack);

    this.svg = d3.select(elem).append('svg')
        .attr('width', this.width + this.margin.left + this.margin.right)
        .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
        .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    this.xAxisG = this.svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0,${this.height})`)
        .call(this.xAxis);

    this.yAxisG = this.svg.append('g')
        .attr('class', 'y axis')
        .call(this.yAxis);

    this.yAxisG.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 6)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text(`Time (${controller.clockUnits})`);

    this.stacksG = this.svg.append('g')
      .attr('class', 'stacks');

    this.highlightG = this.svg.append('g');

    let legend = this.svg.selectAll('.legend-row')
        .data(this.stack.slice().reverse())
      .enter().append('g')
        .attr('class', 'legend-row clickable')
        .attr('transform', (type, i) => `translate(0,${i * 20})`)
        .on('click', type => {
          console.log('type', type, 'stack[0]', this.stack[0]);
          if (this.sortOrder.type === type) {
            if (this.sortOrder.cumulative || type === this.stack[0]) {
              this.sortOrder = chronological;
            } else {
              this.sortOrder = {
                type: type,
                cumulative: true,
                fn: d => d[type] - d.start,
              };
            }
          } else {
            this.sortOrder = {
              type: type,
              cumulative: false,
              fn: d => d[type] - this.start(d, type),
            };
          }
          this.sortBars();
          this.update();
        });

    legend.append('rect')
       .attr('x', this.width - 18)
       .attr('width', 18)
       .attr('height', 18)
       .style('fill', this.color);

    legend.append('text')
       .attr('x', this.width - 24)
       .attr('y', 9)
       .attr('dy', '.35em')
       .style('text-anchor', 'end')
       .text(type => type);
  }

  unmount() {
    // TODO: remove CSS from <head>, remove all from this.elem
  }

  sortBars() {
    let sorted = Array.from(this.data);
    let sortBy = this.sortOrder.fn;
    sorted.sort((d1, d2) => d3.ascending(sortBy(d1), sortBy(d2)));
    sorted.forEach((d,i) => { this.data[d.id].index = i; });
  }

  push(newData) {
    if (newData !== undefined && newData.length > 0) {
      newData.forEach(d => {
        d.id = this.data.length;
        d.index = this.data.length;
        this.data.push(d);
      });
      this.sortBars();
      this.update();
    }
  }

  segments(d) {
    let last = d.start;
    return this.stack.map((type, i) => {
      let segment = {
        kind: 'timesegment',
        absoluteStart: last,
        absoluteEnd: d[type],
        start: last - d.start,
        end: d[type] - d.start,
        delta: d[type] - last,
        type: type,
        d: d,
      };
      last = d[type];
      return segment;
    });
  }

  start(d, type) {
    let last = d.start;
    for (let t of this.stack) {
      if (t == type) {
        return last;
      }
      last = d[t];
    }
  }

  total(d) {
    return d[_.last(this.stack)] - d.start;
  }

  update() {
    let minXShown = 10;
    this.x.domain([0, Math.max(this.data.length, minXShown)]);
    this.xAxis.scale(this.x)(this.xAxisG);
    this.barWidth = this.x(1) - this.x(0);
    this.y.domain([0, d3.max(this.data, d => this.total(d)) / 1000]);
    this.y0 = this.y(0);

    this.yAxis.scale(this.y)(this.yAxisG);

    let stacks = this.stacksG.selectAll('g')
      .data(this.data);

    stacks.enter().append('g');

    stacks.exit().remove();

    let rects = stacks.selectAll('rect')
      .data(d => this.segments(d));

    rects.enter().append('rect')
      .style('fill', seg => this.color(seg.type))
      .attr('class', 'clickable')
      .attr('x', seg => this.x(seg.d.index) + this.barWidth * (seg.d.index < minXShown ? .5 : .9))
      .attr('y', seg => this.y(seg.end / 1000))
      .attr('width', 0)
      .attr('height', seg => this.y(seg.start / 1000) - this.y(seg.end / 1000))
      .on('click', seg => {
        if (this.controller.toggleHighlight([seg])) {
          this.controller.workspace.setClock(seg.absoluteStart);
        }
        this.updateHighlight();
      });

    rects.transition().duration(250)
      .attr('x', seg => this.x(seg.d.index) + this.barWidth * .1)
      .attr('y', seg => this.y(seg.end / 1000))
      .attr('width', this.barWidth * .8)
      .attr('height', seg => this.y(seg.start / 1000) - this.y(seg.end / 1000));

    this.updateHighlight();
  } // update()

  updateHighlight() {
    let hbars = this.highlightG.selectAll('rect')
      .data(this.controller.highlight.filter(h => h.kind === 'timesegment'));
    hbars.enter().append('rect')
      .style('stroke', 'red')
      .style('stroke-width', '3px')
      .style('fill', 'none');
    hbars
      .attr('width', this.barWidth)
      .attr('x', seg => this.x(seg.d.index))
      .attr('y', seg => this.y(seg.end / 1000))
      .attr('height', seg => this.y(seg.start / 1000) - this.y(seg.end / 1000));
    hbars.exit().remove();
  } // updateHighlight()
}

module.exports = Graph;
