import { Seq } from './Seq';
import { isCollection } from './predicates/isCollection';
import { isKeyed } from './predicates/isKeyed';
import { isIndexed } from './predicates/isIndexed';
import isDataStructure from './utils/isDataStructure';

export function toJS(value, options) {
  const useNative = options != null && options.native === true;
  if (!value || typeof value !== 'object') {
    return value;
  }
  const valueIsCollection = isCollection(value);
  if (!valueIsCollection) {
    if (!isDataStructure(value)) {
      return value;
    }
    value = Seq(value);
  }
  if (isKeyed(value)) {
    if (useNative && valueIsCollection) {
      // Keyed collections (Map, OrderedMap, keyed Seqs) become native Maps,
      // preserving iteration order and keys of any type.
      const result = new Map();
      value.__iterate((v, k) => {
        result.set(toJS(k, options), toJS(v, options));
      });
      return result;
    }
    const result = {};
    value.__iterate((v, k) => {
      result[k] = toJS(v, options);
    });
    return result;
  }
  if (useNative && !isIndexed(value)) {
    // Set collections (Set, OrderedSet, set Seqs) become native Sets,
    // preserving iteration order and value-based de-duplication.
    const result = new Set();
    value.__iterate(v => {
      result.add(toJS(v, options));
    });
    return result;
  }
  const result = [];
  value.__iterate(v => {
    result.push(toJS(v, options));
  });
  return result;
}
