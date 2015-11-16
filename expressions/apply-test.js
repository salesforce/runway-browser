"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('expressions/apply.js', function() {
  describe('apply', function() {

    it('basic eq', function() {
      let module = testing.run(`
        var t1 : Boolean = False == False;
        var f1 : Boolean = False == True;
        var t2 : Boolean = True != False;
        var f2 : Boolean = False != False;
      `);
      assert.equal(module.env.getVar('t1').toString(), 'True');
      assert.equal(module.env.getVar('f1').toString(), 'False');
      assert.equal(module.env.getVar('t2').toString(), 'True');
      assert.equal(module.env.getVar('f2').toString(), 'False');
    });

    it('basic cmp', function() {
      let module = testing.run(`
        var t1 : Boolean = 3 < 4;
        var f1 : Boolean = 3 < 3;
        var t2 : Boolean = 3 <= 3;
        var f2 : Boolean = 3 <= 2;
        var t3 : Boolean = 3 >= 3;
        var f3 : Boolean = 3 >= 4;
        var t4 : Boolean = 3 > 2;
        var f4 : Boolean = 3 > 3;
      `);
      assert.equal(module.env.getVar('t1').toString(), 'True');
      assert.equal(module.env.getVar('f1').toString(), 'False');
      assert.equal(module.env.getVar('t2').toString(), 'True');
      assert.equal(module.env.getVar('f2').toString(), 'False');
      assert.equal(module.env.getVar('t3').toString(), 'True');
      assert.equal(module.env.getVar('f3').toString(), 'False');
      assert.equal(module.env.getVar('t4').toString(), 'True');
      assert.equal(module.env.getVar('f4').toString(), 'False');
    });

    it('basic arithmetic', function() {
      let module = testing.run(`
        var a : 0..99 = 3 + 4;
        var b : 0..99 = 3 - 1;
        var c : 0..99 = 3 * 3;
      `);
      assert.equal(module.env.getVar('a').toString(), '7');
      assert.equal(module.env.getVar('b').toString(), '2');
      assert.equal(module.env.getVar('c').toString(), '9');
    });

    it('negation', function() {
      let module = testing.run(`
        var a : Boolean = !False;
        var b : Boolean = !True;
        var c : Boolean = !(3 < 4);
        var d : Boolean = !(3 > 4);
      `);
      assert.equal(module.env.getVar('a').toString(), 'True');
      assert.equal(module.env.getVar('b').toString(), 'False');
      assert.equal(module.env.getVar('c').toString(), 'False');
      assert.equal(module.env.getVar('d').toString(), 'True');
    });

    it('equals', function() {
      let module = testing.run(`
        var ff : Boolean = False == False;
        var ft : Boolean = False == True;
        var tf : Boolean = True == False;
        var tt : Boolean = True == True;
      `);
      assert.equal(module.env.getVar('ff').toString(), 'True');
      assert.equal(module.env.getVar('ft').toString(), 'False');
      assert.equal(module.env.getVar('tf').toString(), 'False');
      assert.equal(module.env.getVar('tt').toString(), 'True');
    });

    it('equals complex', function() {
      let module = testing.run(`
        var ft : Boolean = False == (False == False);
      `);
      assert.equal(module.env.getVar('ft').toString(), 'False');
    });

    it('precedence', function() {
      let module = testing.run(`
        var a : 0..99 = 3 + 4 * 5;
        var b : 0..99 = 3 * 4 + 5;
        var c : Boolean = 3 * 4 > 5;
        var d : Boolean = 5 > 3 * 4;
        var e : Boolean = 3 < 4 == True;
        var f : Boolean = True != 3 < 4;
      `);
      assert.equal(module.env.getVar('a').toString(), '23');
      assert.equal(module.env.getVar('b').toString(), '17');
      assert.equal(module.env.getVar('c').toString(), 'True');
      assert.equal(module.env.getVar('d').toString(), 'False');
      assert.equal(module.env.getVar('e').toString(), 'True');
      assert.equal(module.env.getVar('f').toString(), 'False');
    });

    it('function', function() {
      let module = testing.run(`
        var x : 1..1024 = pow(2, 3);
      `);
      assert.equal(module.env.getVar('x').toString(), '8');
    });

    it('&& basic', function() {
      let module = testing.run(`
        var x1 : Boolean = False && False;
        var x2 : Boolean = False && True;
        var x3 : Boolean = True && False;
        var x4 : Boolean = True && True;
      `);
      assert.equal(module.env.getVar('x1').toString(), 'False');
      assert.equal(module.env.getVar('x2').toString(), 'False');
      assert.equal(module.env.getVar('x3').toString(), 'False');
      assert.equal(module.env.getVar('x4').toString(), 'True');
    });

    it('|| basic', function() {
      let module = testing.run(`
        var x1 : Boolean = False || False;
        var x2 : Boolean = False || True;
        var x3 : Boolean = True || False;
        var x4 : Boolean = True || True;
      `);
      assert.equal(module.env.getVar('x1').toString(), 'False');
      assert.equal(module.env.getVar('x2').toString(), 'True');
      assert.equal(module.env.getVar('x3').toString(), 'True');
      assert.equal(module.env.getVar('x4').toString(), 'True');
    });

    it('&& || precedence', function() {
      let module = testing.run(`
        var x1 : Boolean = False && False || True;
        var x2 : Boolean = True || True && False;
      `);
      assert.equal(module.env.getVar('x1').toString(), 'True');
      assert.equal(module.env.getVar('x2').toString(), 'True');
    });

    it('&& || short-cirtuit', function() {
      let module = testing.run(`
        type Digit : 0..9;
        var set : OrderedSet<Digit>[Digit];
        push(set, 0);
        push(set, 1);
        push(set, 2);
        push(set, 3);
        var x1 : Boolean = False && pop(set) == 0;
        var x2 : Boolean = True || pop(set) == 0;
      `);
      assert.equal(module.env.getVar('x1').toString(), 'False');
      assert.equal(module.env.getVar('x2').toString(), 'True');
      assert.equal(module.env.getVar('set').toString(),
        '{0: 0, 1: 1, 2: 2, 3: 3}');
    });


  });
});
