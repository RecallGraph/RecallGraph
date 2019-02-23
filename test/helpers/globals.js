if (!global.hasOwnProperty('__stack')) {
  Object.defineProperty(global, '__stack', {
    get: function () {
      const orig = Error.prepareStackTrace;
      Error.prepareStackTrace = function (_, stack) {
        return stack;
      };
      const err = new Error;
      Error.captureStackTrace(err, arguments.callee);
      const stack = err.stack;
      Error.prepareStackTrace = orig;
      return stack;
    }
  });
}

if (!global.hasOwnProperty('__line')) {
  Object.defineProperty(global, '__line', {
    get: function () {
      return __stack[1].getLineNumber();
    }
  });
}

if (!global.hasOwnProperty('__function')) {
  Object.defineProperty(global, '__function', {
    get: function () {
      return __stack[1].getFunctionName();
    }
  });
}
