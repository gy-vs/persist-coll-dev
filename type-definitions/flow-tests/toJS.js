// @flow

import { List, Map, OrderedMap, OrderedSet, Record, Seq, Set } from 'immutable';

// With { native: true }, keyed collections become native Maps,
// keeping non-string keys. Values are deeply converted, hence `mixed`,
// mirroring the existing flow definitions for `toJS()`.
const nativeMap: Map<mixed, mixed> = Map<number, string>([
  [1, 'a'],
]).toJS({ native: true });

const orderedNativeMap: Map<mixed, mixed> = OrderedMap([
  ['a', 1],
]).toJS({ native: true });

// Set collections become native Sets.
const nativeSet: Set<mixed> = Set([1, 2]).toJS({ native: true });
const orderedNativeSet: Set<mixed> = OrderedSet([1, 2]).toJS({
  native: true,
});

// Indexed collections remain arrays.
const nativeList: Array<mixed> = List([1, 2]).toJS({ native: true });

// Records remain plain objects.
const MyRecord = Record({ x: 0 });
const nativeRecord: { x: mixed } = MyRecord({ x: 1 }).toJS({ native: true });

// Seqs follow the same rules.
const keyedSeq: Map<mixed, mixed> = Seq.Keyed<number, number>([
  [1, 1],
]).toJS({ native: true });
const indexedSeq: Array<mixed> = Seq.Indexed([1, 2]).toJS({ native: true });
const setSeq: Set<mixed> = Seq.Set([1, 2]).toJS({ native: true });

// Without the option, the legacy shape is used: keyed collections become
// objects and set collections become arrays.
const legacyMap: { [key: string]: mixed } = Map({ a: 'a' }).toJS();
const legacyArray: Array<mixed> = Set([1, 2]).toJS();
const legacyList: Array<mixed> = List([1]).toJS();
