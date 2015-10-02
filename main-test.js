"use strict";

let assert = require("assert");
let main = require("./main.js");

describe('main.js', function() {
  describe('constructDefault', function() {

    it('range defaults to low', function() {
      assert.deepEqual({
        type: 'DoubleDigits',
        value: 10,
      },
        main.constructDefault({
          kind: 'typedecl',
          id: {
            value: 'DoubleDigits'
          },
          type: {
            kind: 'range',
            low: 10,
            high: 99,
          }
        }));
    }); // range

    it('record defaults to each field defaulted', function() {
      assert.deepEqual({
        type: 'DoubleAndTripleDigits',
        double: {
          value: 10
        },
        triple: {
          value: 100
        },
      },
        main.constructDefault({
          kind: 'typedecl',
          id: {
            value: 'DoubleAndTripleDigits'
          },
          type: {
            kind: 'record',
            fields: [
              {
                id: {
                  value: 'double'
                },
                type: {
                  kind: 'range',
                  low: 10,
                  high: 99,
                }
              },
              {
                id: {
                  value: 'triple'
                },
                type: {
                  kind: 'range',
                  low: 100,
                  high: 999,
                }
              }

            ],
          }
        }));
    }); // record

    it('either defaults to first', function() {
      assert.deepEqual({
        type: 'ThisOrThat',
        value: 'This',
        This: {},
      },
        main.constructDefault({
          kind: 'typedecl',
          id: {
            value: 'ThisOrThat'
          },
          type: {
            kind: 'either',
            fields: [
              {
                id: {
                  value: 'This'
                },
                type: {
                  kind: 'record',
                  fields: [],
                },
              },
              {
                id: {
                  value: 'That'
                },
                type: {
                  kind: 'record',
                  fields: [],
                }
              },
            ],
          }
        }));
    }); // either

  }); // constructDefault

});
