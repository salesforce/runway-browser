/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

let d3 = require('d3');
let _ = require('lodash');

let flatten = function(top) {
  let packages = [];
  let process = (parent, dependencies) => {
    _.forOwn(dependencies, (value, name) => {
      packages.push(value);
      value.name = name;
      value.parent = parent;
      if (value.dependencies !== undefined) {
        process(value, value.dependencies);
      }
    });
  };
  process(top, top.dependencies);
  return packages;
};

let depsJSON = require('../dist/deps.json');

let humanURL = project => {
  if (project.resolved === undefined) {
    console.log('no resolved URL for', project);
    return undefined;
  }

  let m = project.resolved.match('^https://registry.npmjs.org/(.*)/-/.*$');
  if (m !== null) {
    return `https://www.npmjs.com/package/${m[1]}`;
  }

  m = project.resolved.match('^(git\\+ssh://git@|git://)github.com/(.*).git(#(.*))?$');
  if (m !== null) {
    let tail = '';
    if (m[4]) {
      tail = `/tree/${m[4]}`;
    }
    return `https://github.com/${m[2]}${tail}`;
  }

  console.log('unknown source for project', project.resolved);
  return undefined;
};

let projects = flatten(depsJSON);

module.exports = function(about) {
  about = d3.select(about);
  about.append('p')
    .html(`
      Runway is a design tool for concurrent and distributed systems. It
      combines specification, model checking, simulation, and interactive
      visualization (animation). You're looking at an instance of
      <a href="https://github.com/salesforce/runway-browser">runway-browser</a>,
      which is the web-based interface to Runway.
      For a gentler introduction, read this
      <a href="https://medium.com/salesforce-open-source/runway-intro-dc0d9578e248">blog post</a>
      or watch this talk:
    `);
  about.append('div')
    .style('text-align', 'center')
    .style('margin', '20px')
    .append('iframe')
      .attr('width', 560)
      .attr('height', 315)
      .attr('src', 'https://www.youtube.com/embed/BAZHZG-8ayo?list=PLlh6TqkU8kg_3FpXLlHMnoVqKZysIzXlK')
      .attr('frameborder', 0)
      .attr('allowfullscreen', true)
      .style('border', '1px solid gray');
  about.append('p')
    .html(`
      To learn more, read the
      <a href="https://www.usenix.org/publications/login/fall2016/ongaro">USENIX ;login: article</a>
      on Runway.
    `);
  about.append('p')
    .html(`
      There are a few example models in the nav bar that you can try out. Note
      that this loads in models from external sources such as GitHub; the URL
      should make it evident where to find the source code for those models.
    `);
  about.append('span')
    .text(`Runway's client-side JavaScript code uses the following ` +
      `open-source projects:`);
  let updateSel = about
    .append('ul')
      .classed('dependencies', true)
      .selectAll('li')
      .data(projects);
  let enterSel = updateSel.enter()
    .append('li');
  enterSel.each(function(project) {
    let li = d3.select(this);
    li.append('a')
      .attr('href', humanURL(project))
      .text(project.name);
    li.append('span')
      .text(' (');
    li.append('a')
      .attr('href', p => p.resolved)
      .text(`v${project.version}`);
    let parentText = '';
    if (project.parent.name !== depsJSON.name) {
      parentText = `, used in ${project.parent.name}`;
    }
    li.append('span')
      .text(`)${parentText}`);
  });
  about.append('p')
    .append('a')
      .attr('href', 'bundled-copyrights.html')
      .text('Additional copyright and license details');
};
