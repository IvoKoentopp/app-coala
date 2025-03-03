// Polyfills para iOS antigo
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Polyfill para Promise.allSettled
if (!Promise.allSettled) {
  Promise.allSettled = function(promises) {
    return Promise.all(
      promises.map(p => 
        Promise.resolve(p).then(
          value => ({ status: 'fulfilled', value }),
          reason => ({ status: 'rejected', reason })
        )
      )
    );
  };
}

// Polyfill para Array.prototype.flat
if (!Array.prototype.flat) {
  Array.prototype.flat = function(depth = 1) {
    return function flat(arr, d) {
      return d > 0 
        ? arr.reduce((acc, val) => 
            acc.concat(Array.isArray(val) ? flat(val, d - 1) : val), 
            []
          )
        : arr.slice();
    }(this, depth);
  };
}

// Polyfill para Object.fromEntries
if (!Object.fromEntries) {
  Object.fromEntries = function(entries) {
    return entries.reduce((obj, [key, val]) => {
      obj[key] = val;
      return obj;
    }, {});
  };
}

// Polyfill para Element.prototype.matches
if (!Element.prototype.matches) {
  Element.prototype.matches = 
    Element.prototype.msMatchesSelector || 
    Element.prototype.webkitMatchesSelector;
}

// Polyfill para Element.prototype.closest
if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;
    do {
      if (el.matches(s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}
