import {
  fromJS,
  is,
  List,
  Map,
  OrderedMap,
  OrderedSet,
  Record,
  Set,
  Stack,
} from 'immutable';
import * as jasmineCheck from 'jasmine-check';

jasmineCheck.install();

describe('Conversion', () => {
  // Note: order of keys based on Map's hashing order
  const js = {
    deepList: [
      {
        position: 'first',
      },
      {
        position: 'second',
      },
      {
        position: 'third',
      },
    ],
    deepMap: {
      a: 'A',
      b: 'B',
    },
    emptyMap: Object.create(null),
    point: { x: 10, y: 20 },
    string: 'Hello',
    list: [1, 2, 3],
  };

  const Point = Record({ x: 0, y: 0 }, 'Point');

  const immutableData = Map({
    deepList: List.of(
      Map({
        position: 'first',
      }),
      Map({
        position: 'second',
      }),
      Map({
        position: 'third',
      })
    ),
    deepMap: Map({
      a: 'A',
      b: 'B',
    }),
    emptyMap: Map(),
    point: Map({ x: 10, y: 20 }),
    string: 'Hello',
    list: List.of(1, 2, 3),
  });

  const immutableOrderedData = OrderedMap({
    deepList: List.of(
      OrderedMap({
        position: 'first',
      }),
      OrderedMap({
        position: 'second',
      }),
      OrderedMap({
        position: 'third',
      })
    ),
    deepMap: OrderedMap({
      a: 'A',
      b: 'B',
    }),
    emptyMap: OrderedMap(),
    point: new Point({ x: 10, y: 20 }),
    string: 'Hello',
    list: List.of(1, 2, 3),
  });

  const immutableOrderedDataString =
    'OrderedMap { ' +
    '"deepList": List [ ' +
    'OrderedMap { ' +
    '"position": "first"' +
    ' }, ' +
    'OrderedMap { ' +
    '"position": "second"' +
    ' }, ' +
    'OrderedMap { ' +
    '"position": "third"' +
    ' }' +
    ' ], ' +
    '"deepMap": OrderedMap { ' +
    '"a": "A", ' +
    '"b": "B"' +
    ' }, ' +
    '"emptyMap": OrderedMap {}, ' +
    '"point": Point { x: 10, y: 20 }, ' +
    '"string": "Hello", ' +
    '"list": List [ 1, 2, 3 ]' +
    ' }';

  const nonStringKeyMap = OrderedMap().set(1, true).set(false, 'foo');
  const nonStringKeyMapString = 'OrderedMap { 1: true, false: "foo" }';

  it('Converts deep JS to deep immutable sequences', () => {
    expect(fromJS(js)).toEqual(immutableData);
  });

  it('Throws when provided circular reference', () => {
    type OType = { a: { b: { c: OType | null } } };

    const o: OType = { a: { b: { c: null } } };
    o.a.b.c = o;
    expect(() => fromJS(o)).toThrow(
      'Cannot convert circular structure to Immutable'
    );
  });

  it('Converts deep JSON with custom conversion', () => {
    const seq = fromJS(js, function (key, sequence) {
      if (key === 'point') {
        // @ts-expect-error -- to convert to real typing
        return new Point(sequence);
      }
      return Array.isArray(this[key])
        ? sequence.toList()
        : sequence.toOrderedMap();
    });
    expect(seq).toEqual(immutableOrderedData);
    expect(seq.toString()).toEqual(immutableOrderedDataString);
  });

  it('Converts deep JSON with custom conversion including keypath if requested', () => {
    const paths: Array<Array<string | number> | undefined> = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const seq1 = fromJS(js, function (key, sequence, keypath) {
      expect(arguments.length).toBe(3);
      paths.push(keypath);
      return Array.isArray(this[key])
        ? sequence.toList()
        : sequence.toOrderedMap();
    });
    expect(paths).toEqual([
      [],
      ['deepList'],
      ['deepList', 0],
      ['deepList', 1],
      ['deepList', 2],
      ['deepMap'],
      ['emptyMap'],
      ['point'],
      ['list'],
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const seq2 = fromJS(js, function (key, sequence) {
      expect(arguments[2]).toBe(undefined);
    });
  });

  it('Prints keys as JS values', () => {
    expect(nonStringKeyMap.toString()).toEqual(nonStringKeyMapString);
  });

  it('Converts deep sequences to JS', () => {
    const js2 = immutableData.toJS();
    expect(is(js2, js)).toBe(false); // raw JS is not immutable.
    expect(js2).toEqual(js); // but should be deep equal.
  });

  it('Converts shallowly to JS', () => {
    const js2 = immutableData.toJSON();
    expect(js2).not.toEqual(js);
    expect(js2.deepList).toBe(immutableData.get('deepList'));
  });

  it('JSON.stringify() works equivalently on immutable sequences', () => {
    expect(JSON.stringify(js)).toBe(JSON.stringify(immutableData));
  });

  it('JSON.stringify() respects toJSON methods on values', () => {
    const Model = Record({});
    Model.prototype.toJSON = function () {
      return 'model';
    };
    expect(Map({ a: new Model() }).toJS()).toEqual({ a: {} });
    expect(JSON.stringify(Map({ a: new Model() }))).toEqual('{"a":"model"}');
  });

  it('is conservative with array-likes, only accepting true Arrays.', () => {
    expect(fromJS({ 1: 2, length: 3 })).toEqual(
      Map().set('1', 2).set('length', 3)
    );
    expect(fromJS('string')).toEqual('string');
  });

  check.it('toJS isomorphic value', { maxSize: 30 }, [gen.JSONValue], v => {
    const imm = fromJS(v);
    expect(imm && imm.toJS ? imm.toJS() : imm).toEqual(v);
  });

  it('Explicitly convert values to string using String constructor', () => {
    expect(() => fromJS({ foo: Symbol('bar') }) + '').not.toThrow();
    expect(() => Map().set('foo', Symbol('bar')) + '').not.toThrow();
    expect(() => Map().set(Symbol('bar'), 'foo') + '').not.toThrow();
  });

  it('Converts an immutable value of an entry correctly', () => {
    const arr = [{ key: 'a' }];
    const result = fromJS(arr).entrySeq().toJS();
    expect(result).toEqual([[0, { key: 'a' }]]);
  });

  describe('toJS with native option', () => {
    const NativeMap = globalThis.Map;
    const NativeSet = globalThis.Set;

    it('converts keyed collections to native Maps without stringifying keys', () => {
      const objectKey = { x: 1 };
      const imm = Map<number | { x: number }, string>([
        [1, 'a'],
        [objectKey, 'b'],
      ]);
      const js = imm.toJS({ native: true });
      expect(js).toBeInstanceOf(NativeMap);
      expect(Map.isMap(js)).toBe(false);
      expect(js.size).toBe(2);
      expect(js.get(1)).toBe('a');
      // @ts-expect-error -- number keys are not stringified
      expect(js.get('1')).toBe(undefined);
      // plain object keys keep their identity
      expect(js.get(objectKey)).toBe('b');
    });

    it('does not collapse object keys into "[object Object]"', () => {
      const js = Map([
        [{ x: 1 }, 'a'],
        [{ y: 2 }, 'b'],
      ]).toJS({ native: true });
      expect(js).toBeInstanceOf(NativeMap);
      expect(js.size).toBe(2);
    });

    it('preserves iteration order of OrderedMap', () => {
      const js = OrderedMap([
        [2, 'b'],
        [1, 'a'],
        [3, 'c'],
      ]).toJS({ native: true });
      expect(js).toBeInstanceOf(NativeMap);
      // a plain Object would sort integer-like keys, a native Map does not
      expect([...js.keys()]).toEqual([2, 1, 3]);
      expect(js.get(1)).toBe('a');
    });

    it('converts Sets to native Sets, preserving values and order', () => {
      const imm = Set([1, 2, 2, 3]);
      const js = imm.toJS({ native: true });
      expect(js).toBeInstanceOf(NativeSet);
      expect(js.size).toBe(3);
      expect(js.has(2)).toBe(true);
      // same iteration order as the immutable Set
      expect([...js]).toEqual([...imm]);
    });

    it('converts OrderedSet to native Set preserving insertion order', () => {
      const js = OrderedSet([3, 1, 2]).toJS({ native: true });
      expect(js).toBeInstanceOf(NativeSet);
      expect([...js]).toEqual([3, 1, 2]);
    });

    it('keeps indexed collections as Arrays', () => {
      const list = List([1, 2, 3]);
      const jsList = list.toJS({ native: true });
      expect(Array.isArray(jsList)).toBe(true);
      expect(jsList).toEqual([1, 2, 3]);

      const stack = Stack([1, 2, 3]);
      const jsStack = stack.toJS({ native: true });
      expect(Array.isArray(jsStack)).toBe(true);
      expect(jsStack).toEqual(stack.toJS());
    });

    it('keeps Records as plain Objects', () => {
      const Point = Record({ x: 0, y: 0 }, 'Point');
      const js = new Point({ x: 10, y: 20 }).toJS({ native: true });
      expect(js).toEqual({ x: 10, y: 20 });
      expect(js).not.toBeInstanceOf(NativeMap);
    });

    it('converts nested structures recursively', () => {
      const js = Map({
        list: List([Map({ a: Set([1, 2]) })]),
      }).toJS({ native: true });
      expect(js).toBeInstanceOf(NativeMap);
      const list = js.get('list')!;
      expect(Array.isArray(list)).toBe(true);
      const innerMap = list[0];
      expect(innerMap).toBeInstanceOf(NativeMap);
      const innerSet = innerMap.get('a');
      expect(innerSet).toBeInstanceOf(NativeSet);
      expect([...innerSet!]).toEqual([1, 2]);
    });

    it('converts immutable keys with the same rules', () => {
      const withListKey = Map([[List([1, 2]), 'list-key']]).toJS({
        native: true,
      });
      const listKey = [...withListKey.keys()][0];
      expect(Array.isArray(listKey)).toBe(true);
      expect(listKey).toEqual([1, 2]);

      const withMapKey = Map([[Map({ x: 1 }), 'map-key']]).toJS({
        native: true,
      });
      const mapKey = [...withMapKey.keys()][0];
      expect(mapKey).toBeInstanceOf(NativeMap);
      expect(mapKey.get('x')).toBe(1);

      const withSetKey = Map([[Set([3]), 'set-key']]).toJS({ native: true });
      const setKey = [...withSetKey.keys()][0];
      expect(setKey).toBeInstanceOf(NativeSet);
      expect([...setKey]).toEqual([3]);
    });

    it('keeps plain JavaScript objects and arrays as plain objects and arrays', () => {
      const js = Map({
        object: { b: 1 },
        list: List([{ c: 2 }]),
      }).toJS({ native: true });
      const object = js.get('object')!;
      expect(object).toEqual({ b: 1 });
      expect(object).not.toBeInstanceOf(NativeMap);
      expect(js.get('list')![0]).toEqual({ c: 2 });
    });

    it('round-trips through fromJS back to an equal structure', () => {
      const imm = Map({
        deepMap: Map({ a: 1, b: Map({ c: 2 }) }),
        set: Set([1, 2, 3]),
        list: List([List([4]), Set([5])]),
        mixed: Map([[1, Set([Map({ x: List([2]) })])]]),
      });
      const roundTripped = fromJS(imm.toJS({ native: true }));
      expect(is(roundTripped, imm)).toBe(true);
      expect(roundTripped).toEqual(imm);
    });

    it('does not change the default toJS behavior', () => {
      const imm = Map({ a: Set([1]), b: Map([[1, 'x']]) });
      const expected = { a: [1], b: { 1: 'x' } };
      expect(imm.toJS()).toEqual(expected);
      expect(imm.toJS(undefined)).toEqual(expected);
      expect(imm.toJS({})).toEqual(expected);
      expect(imm.toJS({ native: false })).toEqual(expected);
    });

    it('does not affect toJSON and toObject', () => {
      const imm = Map({ a: Set([1]) });
      expect(imm.toJSON()).toEqual({ a: Set([1]) });
      expect(imm.toObject()).toEqual({ a: Set([1]) });
    });

    it('uses the native Map and Set constructors even if the globals are replaced', () => {
      // The constructors are captured when the module is loaded, so a
      // shadowing `Map` or `Set` binding (e.g. a top-level `const Map = ...`
      // in a REPL or a classic script) can not confuse toJS.
      const OriginalMap = globalThis.Map;
      const OriginalSet = globalThis.Set;
      // @ts-expect-error -- intentionally breaking the globals for the test
      globalThis.Map = class {};
      // @ts-expect-error -- intentionally breaking the globals for the test
      globalThis.Set = class {};
      try {
        const jsMap = Map({ a: 1 }).toJS({ native: true });
        expect(jsMap).toBeInstanceOf(OriginalMap);
        expect(jsMap.get('a')).toBe(1);
        const jsSet = Set([1]).toJS({ native: true });
        expect(jsSet).toBeInstanceOf(OriginalSet);
        expect(jsSet.has(1)).toBe(true);
      } finally {
        globalThis.Map = OriginalMap;
        globalThis.Set = OriginalSet;
      }
    });
  });
});
