import { expect, test } from 'tstyche';
import {
  List,
  Map as ImmutableMap,
  OrderedMap,
  OrderedSet,
  Record,
  Seq,
  Set as ImmutableSet,
} from 'immutable';

test('toJS({ native: true }) on Map', () => {
  expect(ImmutableMap<number, string>().toJS({ native: true })).type.toBe<
    Map<number, string>
  >();

  expect(ImmutableMap({ a: 'A' }).toJS({ native: true })).type.toBe<
    Map<'a', string>
  >();

  expect(
    ImmutableMap<number, ImmutableSet<number>>().toJS({ native: true })
  ).type.toBe<Map<number, Set<number>>>();

  expect(
    ImmutableMap<ImmutableMap<string, number>, List<number>>().toJS({
      native: true,
    })
  ).type.toBe<Map<Map<string, number>, number[]>>();
});

test('toJS({ native: true }) on OrderedMap', () => {
  expect(
    OrderedMap<number, string>().toJS({ native: true })
  ).type.toBe<Map<number, string>>();
});

test('toJS({ native: true }) on Set', () => {
  expect(ImmutableSet<number>().toJS({ native: true })).type.toBe<
    Set<number>
  >();

  expect(ImmutableSet<ImmutableSet<number>>().toJS({ native: true })).type.toBe<
    Set<Set<number>>
  >();

  expect(
    ImmutableSet<ImmutableMap<number, string>>().toJS({ native: true })
  ).type.toBe<Set<Map<number, string>>>();
});

test('toJS({ native: true }) on OrderedSet', () => {
  expect(OrderedSet<number>().toJS({ native: true })).type.toBe<Set<number>>();
});

test('toJS({ native: true }) on List and Stack-like indexed collections', () => {
  expect(List<number>().toJS({ native: true })).type.toBe<number[]>();

  expect(List<ImmutableSet<number>>().toJS({ native: true })).type.toBe<
    Set<number>[]
  >();

  expect(List<ImmutableMap<number, string>>().toJS({ native: true })).type.toBe<
    Map<number, string>[]
  >();
});

test('toJS({ native: true }) on Seqs', () => {
  expect(
    Seq.Keyed<number, ImmutableSet<number>>().toJS({ native: true })
  ).type.toBe<Map<number, Set<number>>>();

  expect(Seq.Indexed<number>().toJS({ native: true })).type.toBe<number[]>();

  expect(Seq.Set<number>().toJS({ native: true })).type.toBe<Set<number>>();
});

test('toJS({ native: true }) on Record stays a plain object', () => {
  const MyRecord = Record({ x: 0, nested: ImmutableMap<string, number>() });
  // Nested object-typed fields degrade to `unknown`, like DeepCopy.
  expect(MyRecord().toJS({ native: true })).type.toBe<{
    x: number;
    nested: unknown;
  }>();
});

test('toJS() without options is unchanged', () => {
  expect(ImmutableMap<number, number>().toJS()).type.toBe<{
    [x: string]: number;
    [x: number]: number;
    [x: symbol]: number;
  }>();

  expect(ImmutableMap<number, number>().toJS({})).type.toBe<{
    [x: string]: number;
    [x: number]: number;
    [x: symbol]: number;
  }>();

  expect(ImmutableSet<number>().toJS()).type.toBe<number[]>();
  expect(List<number>().toJS()).type.toBe<number[]>();
});
