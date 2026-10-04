import { Seq } from './Seq';
import { hasIterator } from './Iterator';
import { isImmutable } from './predicates/isImmutable';
import { isIndexed } from './predicates/isIndexed';
import { isKeyed } from './predicates/isKeyed';
import isArrayLike from './utils/isArrayLike';
import isPlainObj from './utils/isPlainObj';

export function fromJS(value, converter) {
  return fromJSWith(
    [],
    converter || defaultConverter,
    value,
    '',
    converter && converter.length > 2 ? [] : undefined,
    { '': value }
  );
}

function fromJSWith(stack, converter, value, key, keyPath, parentValue) {
  if (
    typeof value !== 'string' &&
    !isImmutable(value) &&
    (isArrayLike(value) || hasIterator(value) || isPlainObj(value))
  ) {
    if (~stack.indexOf(value)) {
      throw new TypeError('Cannot convert circular structure to Immutable');
    }
    stack.push(value);
    keyPath && key !== '' && keyPath.push(key);
    const seq = Seq(value);
    let mapped;
    if (isKeyed(seq) && typeof Map === 'function' && value instanceof Map) {
      // Native Maps may have non-string keys (including nested data
      // structures), which are preserved as-is by a keyed sequence's map().
      // Convert both keys and values recursively.
      mapped = seq.entrySeq().map(([k, v]) => [
        fromJSWith(stack, converter, k, '', undefined, value),
        fromJSWith(stack, converter, v, k, keyPath, value),
      ]).fromEntrySeq();
    } else {
      mapped = seq.map((v, k) =>
        fromJSWith(stack, converter, v, k, keyPath, value)
      );
    }
    const converted = converter.call(
      parentValue,
      key,
      mapped,
      keyPath && keyPath.slice()
    );
    stack.pop();
    keyPath && keyPath.pop();
    return converted;
  }
  return value;
}

function defaultConverter(k, v) {
  // Effectively the opposite of "Collection.toSeq()"
  return isIndexed(v) ? v.toList() : isKeyed(v) ? v.toMap() : v.toSet();
}
