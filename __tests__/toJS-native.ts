import {
  fromJS,
  is,
  List,
  Map,
  OrderedMap,
  OrderedSet,
  Record,
  Seq,
  Set,
  Stack,
} from 'immutable';

describe('toJS({ native: true })', () => {
  it('converts Map to native Map preserving non-string keys', () => {
    const objKey = { x: 1 };
    const result = Map<unknown, string>([
      [1, 'a'],
      [objKey, 'b'],
    ]).toJS({ native: true });

    expect(result).toBeInstanceOf(globalThis.Map);
    expect(result.size).toBe(2);
    expect(result.get(1)).toBe('a');
    expect(result.get('1')).toBe(undefined);
    expect(result.get('[object Object]')).toBe(undefined);
    expect([...result.entries()]).toEqual([
      [1, 'a'],
      [{ x: 1 }, 'b'],
    ]);
  });

  it('preserves OrderedMap iteration order', () => {
    const result = OrderedMap([
      ['b', 2],
      ['a', 1],
      ['c', 3],
    ]).toJS({ native: true });

    expect(result).toBeInstanceOf(globalThis.Map);
    expect([...result.keys()]).toEqual(['b', 'a', 'c']);
    expect([...result.values()]).toEqual([2, 1, 3]);
  });

  it('converts Set and OrderedSet to native Set', () => {
    const setResult = Set([1, 2, 3, 2, 1]).toJS({ native: true });
    expect(setResult).toBeInstanceOf(globalThis.Set);
    expect([...setResult].sort()).toEqual([1, 2, 3]);

    const orderedResult = OrderedSet([3, 1, 2]).toJS({ native: true });
    expect(orderedResult).toBeInstanceOf(globalThis.Set);
    expect([...orderedResult]).toEqual([3, 1, 2]);
  });

  it('keeps List and Stack as arrays', () => {
    const listResult = List([1, 2, 3]).toJS({ native: true });
    expect(Array.isArray(listResult)).toBe(true);
    expect(listResult).toEqual([1, 2, 3]);

    const stackResult = Stack([1, 2, 3]).toJS({ native: true });
    expect(Array.isArray(stackResult)).toBe(true);
  });

  it('converts Record to a plain object with recursively converted fields', () => {
    const MyRecord = Record({ name: '', nested: null as unknown });
    const record = MyRecord({
      name: 'r',
      nested: Map({ a: Set([1]) }),
    });
    const result = record.toJS({ native: true }) as {
      name: string;
      nested: globalThis.Map<string, globalThis.Set<number>>;
    };

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.name).toBe('r');
    expect(result.nested).toBeInstanceOf(globalThis.Map);
    expect(result.nested.get('a')).toBeInstanceOf(globalThis.Set);
    expect([...(result.nested.get('a') as globalThis.Set<number>)]).toEqual([
      1,
    ]);
  });

  it('recursively converts nested values', () => {
    const data = Map({
      list: List([Map({ s: Set([1, 2]) })]),
      set: Set([Map({ a: List([1]) })]),
    });
    const result = data.toJS({ native: true });

    expect(result).toBeInstanceOf(globalThis.Map);
    expect(result.get('list')).toEqual([
      new globalThis.Map([['s', new globalThis.Set([1, 2])]]),
    ]);
    const innerSet = [
      ...(result.get('set') as Iterable<globalThis.Map<string, number[]>>),
    ][0];
    expect(innerSet).toBeInstanceOf(globalThis.Map);
    expect(innerSet.get('a')).toEqual([1]);
  });

  it('converts keys that are themselves collections', () => {
    const data = Map([[Map({ k: 'key' }), Set([List([1, 2])])]]);
    const result = data.toJS({ native: true });

    expect(result.size).toBe(1);
    const [[key, value]] = result;
    expect(key).toBeInstanceOf(globalThis.Map);
    expect((key as globalThis.Map<string, string>).get('k')).toBe('key');
    expect(value).toBeInstanceOf(globalThis.Set);
    expect([...(value as globalThis.Set<number[]>)][0]).toEqual([1, 2]);
  });

  it('leaves plain objects and arrays nested inside collections as-is', () => {
    const data = Map({
      o: { x: [1, { y: Set([2]) }] },
    });
    const result = data.toJS({ native: true }) as globalThis.Map<
      string,
      { x: [number, { y: globalThis.Set<number> }] }
    >;

    const o = result.get('o') as {
      x: [number, { y: globalThis.Set<number> }];
    };
    expect(Object.getPrototypeOf(o)).toBe(Object.prototype);
    expect(Array.isArray(o.x)).toBe(true);
    expect(o.x[0]).toBe(1);
    expect(o.x[1].y).toBeInstanceOf(globalThis.Set);
    expect([...o.x[1].y]).toEqual([2]);
  });

  it('works on keyed, indexed and set Seqs', () => {
    const keyed = Seq.Keyed([
      [1, 'a'],
      [2, 'b'],
    ]).toJS({ native: true });
    expect(keyed).toBeInstanceOf(globalThis.Map);
    expect(keyed.get(1)).toBe('a');

    const indexed = Seq.Indexed([1, 2]).toJS({ native: true });
    expect(Array.isArray(indexed)).toBe(true);

    const setSeq = Seq.Set([1, 2, 1]).toJS({ native: true });
    expect(setSeq).toBeInstanceOf(globalThis.Set);
    expect(setSeq.size).toBe(2);
  });

  it('round-trips through fromJS with equals', () => {
    // Note: fromJS() converts to unordered Map/Set by design, so this uses
    // only Map, Set and List. OrderedMap/OrderedSet ordering is covered by
    // iteration-order assertions above.
    const original = Map<
      string,
      unknown
    >({
      list: List([Map({ s: Set([1, 2, 1]) })]),
      setOfMaps: Set([Map({ a: List([1]) })]),
      numericKeys: Map<number, unknown>([
        [1, 'a'],
        [2, Set([3])],
      ]),
    });

    const back = fromJS(original.toJS({ native: true }));
    expect(is(back, original)).toBe(true);
  });

  it('round-trips a Map keyed by collections', () => {
    const original = Map([[Map({ k: 'key' }), Set([List([1, 2])])]]);
    const back = fromJS(original.toJS({ native: true }));
    expect(is(back, original)).toBe(true);
  });

  it('does not affect toJSON and toObject', () => {
    const m = Map({ a: Set([1, 2]) });
    expect(m.toJSON()).toEqual({ a: m.get('a') });
    expect(m.toObject()).toEqual({ a: m.get('a') });

    const MyRecord = Record({ a: 0 });
    const r = MyRecord({ a: 1 });
    expect(r.toJSON()).toEqual({ a: 1 });
    expect(r.toObject()).toEqual({ a: 1 });
  });

  it('treats a missing or non-true native option like the default', () => {
    const m = Map([[1, 'a']]);
    expect(m.toJS()).toEqual({ 1: 'a' });
    expect(m.toJS({})).toEqual({ 1: 'a' });
    expect(m.toJS({ native: false })).toEqual({ 1: 'a' });
    // @ts-expect-error native must be a boolean
    expect(m.toJS({ native: 1 })).toEqual({ 1: 'a' });

    const s = Set([1, 2]);
    expect(Array.isArray(s.toJS())).toBe(true);
    expect(Array.isArray(s.toJS({ native: false }))).toBe(true);
  });
});
