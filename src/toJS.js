import { Seq } from './Seq';
import { isCollection } from './predicates/isCollection';
import { isImmutable } from './predicates/isImmutable';
import { isIndexed } from './predicates/isIndexed';
import { isKeyed } from './predicates/isKeyed';
import isDataStructure from './utils/isDataStructure';

// Capture the native Map and Set constructors from the global object, so a
// `Map` or `Set` binding shadowing the global one (e.g. a top-level
// `const Map = ...` in a REPL or a classic script) can not confuse toJS.
/* eslint-disable no-undef, no-restricted-globals */
const nativeGlobal =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof self !== 'undefined'
    ? self
    : global;
/* eslint-enable no-undef, no-restricted-globals */
const NativeMap = nativeGlobal.Map;
const NativeSet = nativeGlobal.Set;

export function toJS(value, options) {
  return toJSWith(value, Boolean(options && options.native));
}

function toJSWith(value, native) {
  if (!value || typeof value !== 'object') {
    return value;
  }
  const isImmutableCollection = isCollection(value);
  if (!isImmutableCollection) {
    if (!isDataStructure(value)) {
      return value;
    }
    // Records, plain Arrays and plain Objects are not Collections: they keep
    // the classic conversion to plain Objects and Arrays, even in native mode.
    value = Seq(value);
  }
  if (isKeyed(value)) {
    if (native && isImmutableCollection) {
      const result = new NativeMap();
      value.__iterate((v, k) => {
        // Immutable keys are converted with the same rules, any other key
        // (like a plain Object used by identity) is preserved as is.
        result.set(
          isImmutable(k) ? toJSWith(k, native) : k,
          toJSWith(v, native)
        );
      });
      return result;
    }
    const result = {};
    value.__iterate((v, k) => {
      result[k] = toJSWith(v, native);
    });
    return result;
  }
  if (native && isImmutableCollection && !isIndexed(value)) {
    const result = new NativeSet();
    value.__iterate(v => {
      result.add(toJSWith(v, native));
    });
    return result;
  }
  const result = [];
  value.__iterate(v => {
    result.push(toJSWith(v, native));
  });
  return result;
}
