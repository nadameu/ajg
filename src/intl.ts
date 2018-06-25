import IntlPolyfill from 'intl';
global.Intl = IntlPolyfill;
(<any>IntlPolyfill).__applyLocaleSensitivePrototypes();
