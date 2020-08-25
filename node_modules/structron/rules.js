module.exports = {
  EQUAL(a, b) {
    return function(dataObj, buffer) {
      if (typeof a == 'string') a = dataObj[a];
      if (typeof b == 'string') b = dataObj[b];
      if (a != b) {
        return `"${a}" is not equal to "${b}"`;
      }
      return false;
    };
  }
}