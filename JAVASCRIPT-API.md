JavaScript is used to create visual and interactive web pages of models. Thus,
JavaScript will need to access the model state and occasionally manipulate it.

Note that this API is subject to change.

## Environment

Get a variable named `bananas` with `model.env.vars.get('bananas')`.
Note that you shouldn't keep this object around. Look it up again later.

Each variable has:
 - `.toString()` with a human-readable string representation
 - `.toJSON()` with a JSON dump
 - `.assign(other)` to assign a different value
 - `.type.createDefaultValue()` to return a new empty value

## Types

### Ranges

    > b = model.env.vars.get('bananas');
    > b.value
    0
    > b.assign(3); // accepts JavaScript Number for convenience
    > b.value
    3
    > b.toString()
    "3"
    > b.toJSON()
    3

### Records

Using the following model:

    type Scores : record {
      home: 0..99,
      away: 0..99,
    }
    var scores : Scores;

We can access it from JavaScript with:

    > scores = model.env.vars.get('scores')
    > scores.toString()
    "Scores { home: 0, away: 0 }"
    > scores.toJSON()
    {
      "home": 0,
      "away": 0
    }

The method `lookup` takes a field name and returns another variable.

    > scores.lookup('home').toString()
    "0"

### Either


#### Enum-Like Either Types

Using the following model:

    type TrafficLight : either { Green, Yellow, Red };
    var light : TrafficLight;

We can access it from JavaScript with:

    > light = module.ast.env.vars.get('light')
    > light.toString()
    "Green"
    > light.toJSON()
    "Green"
    > light.varianttype.name
    "Green"
    > light.match({ Green: 1, Yellow: 2, Red: 3})
    1
    > light.match({ Green: () => 1, Yellow: () => 2, Red: () => 3})
    1

Assignment is tedious (TODO: make the first one work):
    > light.assign('Yellow')
    Uncaught Error: Cannot assign value of Yellow to either-type TrafficLight
    > light.assign(light.type.getVariant('Red').makeDefaultValue())
    > light.toString()
    "Red"

#### Compound Either Types

Using the following model:

    type Person : either {
      Dead,
      Alive {
        heartRate: 1..200,
        asleep: Boolean,
      },
    };
    var dead : Person = Dead;
    var alive : Person = Alive { heartRate: 80, asleep: True };

We can access it from JavaScript with:

    > dead = module.ast.env.vars.get('dead')
    > alive = module.ast.env.vars.get('alive')
    > dead.toString()
    "Dead"
    > dead.toJSON()
    "Dead"
    > alive.toString()
    "Alive { heartRate: 80, asleep: True }"
    > alive.toJSON()
    {
      "tag": "Alive",
        "fields": {
          "heartRate": 80,
          "asleep": "True"
        }
    }
    > alive.match({
    .   Dead: 0,
    .   Alive: details => details.heartRate,
    . }).toString()
    "80"

Assignment is also tedious:
    > dead.assign(dead.type.getVariant('Alive').makeDefaultValue())
    > dead.lookup('heartRate').assign(10)

Don't use `.lookup()` unless you know what variant the value is (TODO: make
this always return `undefined`).


### Collections

.index
.forEach

#### Arrays


#### Sets


#### Ordered Sets

