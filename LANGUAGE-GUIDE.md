## Types

### Ranges

A `range` is an integer within a fixed interval. The interval is written
`<low>..<high>` where low and high are both inclusive. Ranges default to the
low end of their interval.

    > type T : 1..3;
    > var t : T;
    > t
    1
    > t = 3
    > t
    3

Assigning to a range outside its interval will result in a BoundsError and
leave the value unchanged.

    > t = 4
    ModelingBoundsError: Cannot assign value of 4 to range T: 1..3;
    > t
    3

### Records

A `record` is a compound object made up of a fixed number of fields (called a
`struct` in some languages). Each field is identified by name and has an
associated type. A default record simply has all its fields defaulted.

    > type Scores : record {
    .   home: 0..99,
    .   away: 0..99,
    . }
    > var scores : Scores;
    > scores
    Scores { home: 0, away: 0 }
    > scores.home = 50
    > scores.away = 30
    > scores
    Scores { home: 50, away: 30 }

Records can also be created and assigned wholesale:

    > scores = Scores {
    .   home: 20,
    .   away: 30,
    . }
    > scores
    Scores { home: 20, away: 30 }

### Either

An `either` type is a compound object that is in one of many possible variants.
A default either type is set to its first variant.

#### Enum-Like Either Types

The simplest either types distinguish between names, like `enum` in C:

    > type TrafficLight : either { Green, Yellow, Red };
    > var tl : TrafficLight;
    > tl
    Green
    > tl = Yellow;
    > tl
    Yellow
    > tl = False;
    ModelingTypeError: Cannot assign False (EitherVariant) to variable of type TrafficLight

These simple variant names (Green, Yellow, and Red) are placed in the outer
namespace, so they must be unique across all accessible either definitions.

You can use `==` to compare simple variant names, or you can use `match` statements:

    > var go : Boolean;
    > match tl {
    .   Green => { go = True; },
    .   Yellow => { go = True; /* reckless driver */ },
    .   Red => {go = False; },
    . } 
    > go
    True

In a match statement, all variants must be accounted for.

The built-in type ``Boolean`` is an either type defined as follows:

    type Boolean: either {
        False,
        True,
    }

Use Boolean when there are two possibilities and the context makes it obvious
what `True` and `False` mean. Otherwise, define your own either type.

#### Compound Either Types

Variants of an either type can also carry data, like a nested record. The
compiler ensures that this data is only accessed when it's valid.

    > type Person : either {
    .   Dead,
    .   Alive {
    .     heartRate: 1..200,
    .     asleep: Boolean,
    .   },
    . };
    > var p : Person;
    > p
    Dead
    > p = Alive { heartRate: 80, asleep: False };
    > p
    Alive { heartRate: 80, asleep: False }

Note that we can't write `p == Alive`, nor can we write `p.heartRate`.
A match statement is the only way to get at a Person's heart rate:

    > match p {
    .   Dead => {
    .     isResting = True;
    .   },
    .   Alive as details => {
    .     isResting = (details.heartRate < 100);
    .   },
    . }
    > isResting
    True

The keyword `as` in a match statement makes a copy of the variables.
As a result, this would be an incorrect way to go to sleep:

    > match p {
    .   Dead => { /* resting quite well already */ },
    .   Alive as details => {
    .     details.asleep = True;
    .   },
    . }
    > p
    Alive { heartRate: 80, asleep: False }

The correct implementation assigns back to the variable:

    > match p {
    .   Dead => { /* resting quite well already */ },
    .   Alive as details => {
    .     p = Alive { heartRate: 80, asleep: True };
    .   },
    . }
    > p
    Alive { heartRate: 80, asleep: True }

When you have variables that are only valid sometimes, try to express that
using either types rather than convention. This will help avoid bugs and reduce
redundancy in your state variables.

### Collections

Various collection types are baked into the compiler.

Arrays are fixed length.

The following collections are of varying length (up to a fixed limit) and
present similar interfaces:
- Set: no duplicates, no ordering
- MultiSet: allows duplicates, no ordering
- OrderedSet: no duplicates, preserves insertion order
- Vector: allows duplicates, preserves insertion order 

#### Arrays

Arrays are of fixed size and capacity and contain values of uniform type. They
are indexed by a specified range type.

    > var bools : Array<Boolean>[11..14];
    > bools
    [11: False, 12: False, 13: False, 14: False]
    > bools[12] = True
    > bools
    [11: False, 12: True, 13: False, 14: False]
    > 

Use a `for` loop to iterate through an array by reference:

    > for b in bools {
    .   b = !b;
    . }
    > bools
    [11: True, 12: False, 13: True, 14: True]

#### Sets

Sets contain distinct values of uniform type, and have a varying size up to a
fixed capacity. Like arrays, they are declared with a range type that
determines their capacity. Use `push` to add items to sets.

    > var boolSet : Set<Boolean>[22..25];
    > boolSet
    {}
    > push(boolSet, True);
    > push(boolSet, False);
    > boolSet
    {False, True}
    > push(boolSet, False);
    > boolSet
    {False, True}

You can use a for loop to iterate through the items of a set by reference, just
like arrays.

The function `pop` removes an unspecified item from a non-empty set:

    > var b : Boolean = pop(boolSet);
    > b
    True
    > b = pop(boolSet);
    > b
    False
    > b = pop(boolSet);
    ModelingBoundsError: Cannot pop from empty set {}

The function `remove` removes a particular item from a set. It returns `True`
if something was removed, `False` otherwise.

    > push(boolSet, True)
    > boolSet
    {True}
    > print remove(boolSet, True);
    True
    > print remove(boolSet, True);
    False
    > boolSet
    {}


#### Ordered Sets

An `OrderedSet` is just like a `Set` but the indexing is meaningful and
retained. The pushes and pops obey stack-like FIFO ordering.

TODO: specify better

## Variable Declarations

Done using the keyword `var`, as seen above. All variables must be declared
with an explicit type.

The intent is to provide proper block scoping. As of this writing, this has not
been tested very well.

Declaring a variable with a name that shadows another will (should, at least)
result in a compiler error.

    > var x : Boolean;
    > while True { var y: Boolean; break; }
    > print y;
    ModelingLookupError: 'y' is not a variable/constant in scope, attempted access
    > while True { var x: Boolean; break; }
    ModelingTypeError: Cannot shadow variable x (False) with False

## Control Structures

### If Statements

The standard stuff. No parentheses are normally required around the expression
(if you have an empty code block and a single identifier for your condition,
you may need parentheses to disambiguate parsing; it's rare but came up in the
toomanybananas example).
Braces are required around the code blocks.

     > if bananas == 0 {
     .   state = GoingToStore;
     . } else {
     .   bananas -= 1;
     .   state = Happy;
     . }
     > if bananas == 3 {
     .   bananas = 4;
     . }

### Match Statements

These are described in the Either Types section above.

### For Loops

Only for-each loops are provided, and these are described in the Containers
section above. `break` and `continue` work as in most languages.

TODO: define modification during iteration.

### While Loops

The standard stuff. `break` and `continue` work as in most languages.

    > while True {
    .   // useless loop
    .   break;
    . }

Prefer for-each loops when possible, since termination is more obvious.

## Functions and Operators

### Built-In Operators

- Negation is defined over `Boolean`: `!x`
- Equality is defined over all types: `x == y`, `x != y`.
- Ordering is defined over ranges and integer literals:
  `x < y`, `x <= y`, `x >= y`, `x > y`.
- The standard arithmetic operators are defined over ranges and integer
  literals:
  `x + y`, `x - y`, `x * y`, `x / y` (truncating), `x % y`.
- The same have shorthand for assigment:
  `x += y` (syntactic sugar for `x = x + y`), `x -= y`, `x *= y`, `x /= y`, `x %= y`.
- Logical and and or are defined over `Boolean`:
  `x && y`, `x || y` (short-circuiting).


### Built-In Functions

- `push(c: Collection, i: Item)`: add item to non-full container
- `pop(c: Collection) -> Item`: remove some item from non-empty container
- `remove(c: Collection, i: Item) -> Boolean`: remove given item from container, return whether it was removed
- `contains(c: Collection, i: Item) -> Boolean`
- `size(c: Collection) -> Integer`: current number of items in container
- `capacity(c: Collection) -> Integer`: maximum possible size for container
- `empty(c: Collection) -> Boolean`: `size(c) == 0`
- `full(c: Collection) -> Boolean`: `size(c) == capacity(c)`
- `urandom<A>() -> A` where `A` is a range: uniform random number in range
- `urandomRange(low: Integer, high: Integer) -> Integer`: uniform random number between low and high, inclusive
- `pow(Integer, Integer) -> Integer`: exponentiation

### User-Defined Functions

User-defined functions are defined as follows:

    > function mod4(digit: 0..9) -> 0..4 {
    .   return digit % 4;
    . }
    > print mod4(9);
    1
    > print mod4(8);
    0


Functions are permitted to read and write global state, and no return type is required:

    > var b : Boolean;
    > function setToTrue() { b = True; }
    > setToTrue()
    > b
    True

All arguments are copied into the function, and the return value (if any) is
copied out (pass-by-value).

## Execution Model

After initialization, rules are fired one at a time, nondeterministically.
All invariants are re-checked in between firing rules.

### Initialization

Statements placed at the top-level of a module are executed when the module is
loaded. This can be used to initialize state.

### Rules

A `rule` is a named block of code that modifies the global state. One rule can
be applied at a time. A rule is said to be *active* if applying it would change
the state and *inactive* otherwise (TODO: this definition fails for
non-deterministic rules).

    > var counter : 0..9;
    > rule doubleIncrement {
    .   counter = (counter + 2) % 10;
    . }

Note that after a rule is applied, its stack is gone. Any changes need to be
saved back to the global variables.

#### Rule-For

Sometimes you'll want to define a rule that applies to each of many variables
within a container. The `rule-for` syntax combines a rule definition with a for
loop.

By placing a normal for loop within a rule, the single rule will apply to all
objects atomically:

    > rule move {
    .   for elevator in elevators {
    .     // move elevator
    .   }
    . }

Using rule-for declares several rules, one for each object. In this example,
elevators move at different times (each elevator moves atomically, but they do
not move as a group atomically).

    > rule move for elevator in elevators {
    .   // move elevator
    . }

### State Invariants

An `invariant` is a named block of code that runs assertions on the global state.
Invariants are checked in between applying rules.

> invariant counterIsEven {
.  assert counter % 2 == 0;
. }

Note that you can also use `assert` within a rule or a function.

Currently, the compiler won't stop you from changing state in an invariant.
Seriously, don't do that.

### Inductive Invariants

An `inductive invariant` is a type of invariant that needs to access both the
previous and the current state. For example, a state invariant can't express
that an integer monotonically increases, but an inductive invariant can
(`prev.x <= curr.x`).

TODO: Implement and document.

## Reserved Words
  - as
  - assert
  - break
  - continue
  - distribution
  - either
  - else
  - for
  - function
  - if
  - in
  - invariant
  - match
  - node
  - param
  - print
  - record
  - return
  - rule
  - type
  - var
  - while
