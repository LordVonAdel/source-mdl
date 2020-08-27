(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
const MDL = require('source-mdl');
const Buffer = require('buffer/').Buffer;

window.convert = function(mdl, vvd, vtx) {
  let model = new MDL();
  model.import({
    mdlData: Buffer.from(mdl), 
    vvdData: Buffer.from(vvd), 
    vtxData: Buffer.from(vtx)
  });
  let gltf = JSON.stringify(model.toGLTF());
  download("model.gltf", gltf);
}

window.convertToJSON = function(mdl, vvd, vtx) {
  let model = new MDL();
  model.import({
    mdlData: Buffer.from(mdl), 
    vvdData: Buffer.from(vvd), 
    vtxData: Buffer.from(vtx)
  });
  let json = JSON.stringify(model.toData());
  download("model.json", json);
}

function download(filename, content) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
},{"buffer/":6,"source-mdl":8}],5:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],6:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this,require("buffer").Buffer)
},{"base64-js":5,"buffer":2,"ieee754":7}],7:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],8:[function(require,module,exports){
module.exports = require('./src/MDL.js');
},{"./src/MDL.js":9}],9:[function(require,module,exports){
const Import = require("./import/Import.js");
const toGLTF = require("./export/toGLTF.js");

const FLAGS = {
  0: "STUDIOHDR_FLAGS_AUTOGENERATED_HITBOX",
  1: "STUDIOHDR_FLAGS_USES_ENV_CUBEMAP",
  2: "STUDIOHDR_FLAGS_FORCE_OPAQUE",
  3: "STUDIOHDR_FLAGS_TRANSLUCENT_TWOPASS",
  4: "STUDIOHDR_FLAGS_STATIC_PROP",
  5: "STUDIOHDR_FLAGS_USES_FB_TEXTURE",
  6: "STUDIOHDR_FLAGS_HASSHADOWLOD",
  7: "STUDIOHDR_FLAGS_USES_BUMPMAPPING",
  8: "STUDIOHDR_FLAGS_USE_SHADOWLOD_MATERIALS",
  9: "STUDIOHDR_FLAGS_OBSOLETE",
  10: "STUDIOHDR_FLAGS_UNUSED",
  11: "STUDIOHDR_FLAGS_NO_FORCED_FADE",
  12: "STUDIOHDR_FLAGS_FORCE_PHONEME_CROSSFADE",
  13: "STUDIOHDR_FLAGS_CONSTANT_DIRECTIONAL_LIGHT_DOT",
  14: "STUDIOHDR_FLAGS_FLEXES_CONVERTED",
  15: "STUDIOHDR_FLAGS_BUILT_IN_PREVIEW_MODE",
  16: "STUDIOHDR_FLAGS_AMBIENT_BOOST",
  17: "STUDIOHDR_FLAGS_DO_NOT_CAST_SHADOWS",
  18: "STUDIOHDR_FLAGS_CAST_TEXTURE_SHADOWS"
} 

class MDL {

  constructor() {
    this.name = "";

    this.eyeposition = [0, 0, 0];
    this.illumposition = [0, 0, 0];
    this.hullMin = [-1, -1, -1];
    this.hullMax = [1, 1, 1];
    this.viewBBMin = [0, 0, 0];
    this.viewBBMax = [0, 0, 0];

    this.flags = 0;
    this.mass = 0;
    this.surfaceProp = "";

    this.keyvalues = [];

    this.bones = [];
    this.hitboxes = [];

    this.textures = [];
    this.textureDirs = [],

    // First layer: LOD, Second layer: Mesh
    this.meshes = [];

    // First Layer: LOD, Second layer: Vertice
    this.vertices = [];

    this.raw = {};
  }

  getMetadata() {
    return {
      name: this.name,
      mass: this.mass,
      flags: this.getFlagStrings(),
      surfaceProp: this.surfaceProp,
      LODs: this.vertices.length,
      verticeNumber: this.vertices[0].length,
      textures: this.textures,
      textureDirs: this.textureDirs
    }
  }

  _flipFlags(flags) {
    /**
     * @todo Test this
     */
    let flagsFlipped = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 8; j++) {
        flagsFlipped |= (flags & (i * 8 + (8 - j))) << (i * 8 + j);
      }
    }
    return flagsFlipped;
  }

  getFlagStrings() {
    let flagsFlipped = this._flipFlags(this.flags);

    let out = [];
    for (let i = 0; i < 19; i++) {
      let bit = (this.flags << i) & 1;
      if (bit) {
        out.push(FLAGS[i]);
      }
    }
    for (let i = 19; i < 32; i++) {
      let bit = (flagsFlipped << i) & 1;
      if (bit) {
        out.push("UNKOWN FLAG: " + i);
      }
    }
    return out;
  }

  import(datas) {
    new Import(datas, this);
  }

  toGLTF() {
    return toGLTF(this);
  }

  toData() {
    return this.raw;
  }

}

module.exports = MDL;
},{"./export/toGLTF.js":10,"./import/Import.js":11}],10:[function(require,module,exports){
(function (Buffer){
const POSITION_SIZE = 12;
const NORMAL_SIZE = 12;
const TEXCOORS_SIZE = 8;
const VERTEX_SIZE = POSITION_SIZE + NORMAL_SIZE + TEXCOORS_SIZE;
const INDEX_SIZE = 2;

module.exports = function(mdl) {
  
  const LOD_LEVEL = 0;
  let vertices = mdl.vertices[LOD_LEVEL];

  let positionOffset = 0;
  let positionLength = vertices.length * POSITION_SIZE;
  let normalOffset = positionOffset + positionLength;
  let normalLength = vertices.length * NORMAL_SIZE;
  let texcoordOffset = normalOffset + normalLength;
  let texcoordLength = vertices.length * TEXCOORS_SIZE;
  let indicesOffset = texcoordOffset + texcoordLength;

  let indicesNumber = mdl.meshes[LOD_LEVEL].reduce((val, cur) => val + cur.indices.length, 0);
  let indicesLength = indicesNumber * INDEX_SIZE;

  // Can't use hull value from MDL because valve's calculations are off. Maybe because they account for animation?
  let minPosition = [Infinity, Infinity, Infinity];
  let maxPosition = [-Infinity, -Infinity, -Infinity];

  let buffer = Buffer.alloc(indicesOffset + indicesLength);

  for (let i = 0; i < vertices.length; i++) {
    let vertex = vertices[i];

    for (let j = 0; j < 3; j++) {
      minPosition[j] = Math.min(vertex.position[j], minPosition[j]);
      maxPosition[j] = Math.max(vertex.position[j], maxPosition[j]);

      buffer.writeFloatLE(vertex.position[j], positionOffset + i * POSITION_SIZE + j * 4);
      buffer.writeFloatLE(vertex.normal[j], normalOffset + i * NORMAL_SIZE + j * 4);
    }
    
    buffer.writeFloatLE(vertex.texCoords[0], texcoordOffset + i * TEXCOORS_SIZE);
    buffer.writeFloatLE(vertex.texCoords[1], texcoordOffset + i * TEXCOORS_SIZE + 4);
  }

  let indexAddress = indicesOffset;
  let meshOffsets = [];
  let indexOffset = 0;
  for (let mesh of mdl.meshes[LOD_LEVEL]) {
    meshOffsets.push(indexAddress - indicesOffset);
    for (let index of mesh.indices) {
      buffer.writeUInt16LE(index + indexOffset, indexAddress);
      indexAddress += 2;
    }
  }

  let accessors = [
    { // Position
      bufferView: 0, 
      componentType: 5126,
      count: vertices.length,
      max: maxPosition,
      min: minPosition,
      type: "VEC3"
    },
    { // Normal
      bufferView: 1,
      componentType: 5126,
      count: vertices.length,
      type: "VEC3"
    },
    { // Texcoord_0
      bufferView: 2,
      componentType: 5126,
      count: vertices.length,
      type: "VEC2"
    }
  ];

  let meshes = [];
  for (let i = 0; i < mdl.meshes[LOD_LEVEL].length; i++) {
    let mesh = mdl.meshes[LOD_LEVEL][i];
    meshes.push({
      primitives: [{
        mode: 4,
        attributes: {
          POSITION: 0,
          NORMAL: 1,
          TEXCOORD_0: 2
        },
        indices: 3 + i,
        material: mesh.material
      }]
    });
    
    accessors.push({
      bufferView: 3,
      componentType: 5123,
      count: mesh.indices.length,
      byteOffset: meshOffsets[i],
      type: "SCALAR"
    });
  }

  let materials = mdl.textures.map((tex) => ({
    name: tex
  }));

  let gltf = {
    asset: {
      version: "2.0",
      generator: "source-mdl"
    },
    scenes: [{
      name: mdl.name,
      nodes: meshes.map((m, i) => i)
    }],
    nodes: meshes.map((m, i) => ({
      name: mdl.name + i,
      mesh: i
    })),
    meshes,
    accessors,
    bufferViews: [
      {
        buffer: 0,
        byteOffset: positionOffset,
        byteLength: positionLength
      },
      {
        buffer: 0,
        byteOffset: normalOffset,
        byteLength: normalLength
      },
      {
        buffer: 0,
        byteOffset: texcoordOffset,
        byteLength: texcoordLength
      },
      {
        buffer: 0,
        byteOffset: indicesOffset,
        byteLength: indicesLength
      }
    ],
    buffers: [
      {
        byteLength : buffer.length,
        uri : "data:application/octet-stream;base64," + buffer.toString('base64')
      }
    ],
    materials
  };

  return gltf;
}
}).call(this,require("buffer").Buffer)
},{"buffer":2}],11:[function(require,module,exports){
const studio = require('./studio.js');
const optimize = require('./optimize.js');

const OPTIMIZED_MODEL_FILE_VERSION = 7;

const STRIP_IS_TRILIST	= 0x01;
const STRIP_IS_TRISTRIP	= 0x02;

const STRIPGROUP_IS_FLEXED          = 0x01;
const STRIPGROUP_IS_HWSKINNED       = 0x02;
const STRIPGROUP_IS_DELTA_FLEXED    = 0x04;
const STRIPGROUP_SUPPRESS_HW_MORPH  = 0x08;

/**
 * MDL scheme: https://developer.valvesoftware.com/wiki/MDL
 * VTX scheme: https://developer.valvesoftware.com/wiki/VTX
 * VVD scheme: https://developer.valvesoftware.com/wiki/VVD
 * PHY scheme: https://developer.valvesoftware.com/wiki/PHY
 */

 /**
  * Importer class for Source Engine models
  */
class Import {

  constructor(data, mdl) {
    this.mdl = mdl;

    let id = data.mdlData.readInt32BE(0);
    if (id != 0x49445354) throw new Error("Unkown MDL id: " + id);

    this.importMDL = studio.studiohdr_t.report(data.mdlData, 0, { hideReferenceValues: true, monitorUsage: true });
    this.importVTX = optimize.FileHeader_t.report(data.vtxData, 0, { hideReferenceValues: true, monitorUsage: true });
    this.importVVD = studio.vertexFileHeader_t.report(data.vvdData, 0, { hideReferenceValues: true, monitorUsage: true });

    console.log(this.importMDL.toString());

    this.headerMDL = this.importMDL.data;
    this.headerVTX = this.importVTX.data;
    this.headerVVD = this.importVVD.data;
    mdl.raw = {
      MDL: this.headerMDL,
      VTX: this.headerVTX,
      VVD: this.headerVVD
    }

    if (this.headerMDL.checksum != this.headerVTX.checkSum) throw new Error("Checksums don't match! (MDL <-> VTX)");
    if (this.headerMDL.checksum != this.headerVVD.checksum) throw new Error("Checksums don't match! (MDL <-> VVD)");
    if (this.headerVTX.version != OPTIMIZED_MODEL_FILE_VERSION) throw new Error("Incompatible VTX version!");

    this.mdl.name = this.headerMDL.name;
    this.mdl.surfaceProp = this.headerMDL.surfaceProp;
    this.mdl.textureDirs = this.headerMDL.texturedirs.map(t => t.name);
    this.mdl.textures = this.headerMDL.textures.map(t => t.name);
    this.mdl.hullMin = this.headerMDL.hull_min;
    this.mdl.hullMax = this.headerMDL.hull_max;

    this.mdl.vertices = [];
    this.mdl.meshes = [];
    for (let i = 0; i < this.headerVVD.numLODs; i++) {
      this.mdl.vertices[i] = [];
      this.mdl.meshes[i] = [];
    }

    if (this.headerVVD.fixups.length == 0) {
      for (let i = 0; i < this.headerVVD.numLODVertexes0; i++) {
        let address = this.headerVVD.vertexDataStart + i * 48;
        let vtx = studio.mstudiovertex_t.read(data.vvdData, address);
        this.mdl.vertices[0].push({
          position: [vtx.m_vecPosition.x, vtx.m_vecPosition.y, vtx.m_vecPosition.z],
          normal: [vtx.m_vecNormal.x, vtx.m_vecNormal.y, vtx.m_vecNormal.z],
          texCoords: [vtx.m_vecTexCoord.x, vtx.m_vecTexCoord.y]
        });
      }
    } else {
      for (let fixup of this.headerVVD.fixups) {
        for (let i = 0; i < fixup.numVertexes; i++) {
          let address = this.headerVVD.vertexDataStart + (i + fixup.sourceVertexId) * 48;
          for (let j = fixup.lod; j >= 0; j--) {
            let vtx = studio.mstudiovertex_t.read(data.vvdData, address)
            this.mdl.vertices[j].push({
              position: [vtx.m_vecPosition.x, vtx.m_vecPosition.y, vtx.m_vecPosition.z],
              normal: [vtx.m_vecNormal.x, vtx.m_vecNormal.y, vtx.m_vecNormal.z],
              texCoords: [vtx.m_vecTexCoord.x, vtx.m_vecTexCoord.y]
            });
          }
        }
      }
    }

    for (let i = 0; i < this.headerMDL.bodyparts.length; i++) {
      let bodyPartsMDL = this.headerMDL.bodyparts[i];
      let bodyPartsVTX = this.headerVTX.bodyParts[i];
      for (let j = 0; j < bodyPartsMDL.models.length; j++) {
        let modelMDL = bodyPartsMDL.models[j];
        let movelVTX = bodyPartsVTX.models[j];
        for (let k = 0; k < modelMDL.meshes.length; k++) {
          let meshMDL = modelMDL.meshes[k];

          for (let lod_level = 0; lod_level < this.headerVVD.numLODs; lod_level++) { 
            let meshVTX = movelVTX.LODs[lod_level].meshes[k];

            let mesh = {
              indices: [],
              material: meshMDL.material
            };
            this.mdl.meshes[lod_level].push(mesh);

            for (let stripGroup of meshVTX.stripGroups) {

              for (let strip of stripGroup.strips) {
                if (strip.flags & STRIP_IS_TRILIST) {
                  for (let i = strip.numIndices - 1; i >= 0; i--) {
                    let vtxId = stripGroup.indices[i + strip.indexOffset];
                    let vtx = stripGroup.vertices[vtxId];
                    mesh.indices.push(vtx.origMeshVertID + meshMDL.vertexoffset);
                  }
                } else if (strip.flags & STRIP_IS_TRISTRIP) {
                  /**
                   * @todo Test it with a model that uses tristrips
                   */
                  for (let i = strip.numIndices + strip.indexOffset; i >= strip.indexOffset + 2; i--) {
                    mesh.indices.push(
                      stripGroup.vertices[stripGroup.indices[i]].origMeshVertID + meshMDL.vertexoffset,
                      stripGroup.vertices[stripGroup.indices[i - 2]].origMeshVertID + meshMDL.vertexoffset,
                      stripGroup.vertices[stripGroup.indices[i - 1]].origMeshVertID + meshMDL.vertexoffset
                    );
                  }
                }
              }
            }
          }
        }
      }
    }
  }

}

module.exports = Import;
},{"./optimize.js":12,"./studio.js":13}],12:[function(require,module,exports){
const StudioStruct = require("structron");

/**
 * Structures based on /src/public/optimize.h
 */

const BoneStateChangeHeader_t = new StudioStruct("BoneStateChangeHeader_t")
  .addMember(StudioStruct.TYPES.INT, "hardwareID")
  .addMember(StudioStruct.TYPES.INT, "newBoneID")

const Vertex_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.CHAR, "boneWeightIndex0")
  .addMember(StudioStruct.TYPES.CHAR, "boneWeightIndex1")
  .addMember(StudioStruct.TYPES.CHAR, "boneWeightIndex2")
  .addMember(StudioStruct.TYPES.CHAR, "numBones")
  .addMember(StudioStruct.TYPES.USHORT, "origMeshVertID")
  .addMember(StudioStruct.TYPES.CHAR, "boneID0")
  .addMember(StudioStruct.TYPES.CHAR, "boneID1")
  .addMember(StudioStruct.TYPES.CHAR, "boneID2");

const StripHeader_t = new StudioStruct("StripHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numIndices")
  .addMember(StudioStruct.TYPES.INT, "indexOffset")
  .addMember(StudioStruct.TYPES.INT, "numVerts")
  .addMember(StudioStruct.TYPES.INT, "vertOffset")
  .addMember(StudioStruct.TYPES.SHORT, "numBones")
  .addMember(StudioStruct.TYPES.CHAR, "flags")
  .addMember(StudioStruct.TYPES.INT, "numBoneStateChanges")
  .addMember(StudioStruct.TYPES.INT, "boneStateChangeOffset")
  .addArray(Vertex_t, "vertices", "vertOffset", "numVerts", true)
  //.addArray(BoneStateChangeHeader_t, "boneStateChange", "boneStateChangeOffset", "numBoneStateChanges", true);

const StripGroupHeader_t = new StudioStruct("StripGroupHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numVerts")
  .addMember(StudioStruct.TYPES.INT, "vertOffset")
  .addMember(StudioStruct.TYPES.INT, "numIndices")
  .addMember(StudioStruct.TYPES.INT, "indexOffset")
  .addMember(StudioStruct.TYPES.INT, "numStrips")
  .addMember(StudioStruct.TYPES.INT, "stripOffset")
  .addMember(StudioStruct.TYPES.CHAR, "flags")
  .addArray(Vertex_t, "vertices", "vertOffset", "numVerts", true)
  .addArray(StudioStruct.TYPES.USHORT, "indices", "indexOffset", "numIndices", true)
  .addArray(StripHeader_t, "strips", "stripOffset", "numStrips", true);

const MeshHeader_t = new StudioStruct("MeshHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numStripGroups")
  .addMember(StudioStruct.TYPES.INT, "stripGroupHeaderOffset")
  .addMember(StudioStruct.TYPES.CHAR, "flags")
  .addArray(StripGroupHeader_t, "stripGroups", "stripGroupHeaderOffset", "numStripGroups", true);

const ModelLODHeader_t = new StudioStruct("ModelLODHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numMeshes")
  .addMember(StudioStruct.TYPES.INT, "meshOffset")
  .addMember(StudioStruct.TYPES.FLOAT, "switchPoint")
  .addArray(MeshHeader_t, "meshes", "meshOffset", "numMeshes", true);

const ModelHeader_t = new StudioStruct("ModelHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numLODs")
  .addMember(StudioStruct.TYPES.INT, "lodOffset")
  .addArray(ModelLODHeader_t, "LODs", "lodOffset", "numLODs", true);

const BodyPartHeader_t = new StudioStruct("BodyPartHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numModels")
  .addMember(StudioStruct.TYPES.INT, "modelOffset")
  .addArray(ModelHeader_t, "models", "modelOffset", "numModels", true);

const FileHeader_t = new StudioStruct("FileHeader_t")
  .addMember(StudioStruct.TYPES.INT, "version")
  .addMember(StudioStruct.TYPES.INT, "vertCacheSize")
  .addMember(StudioStruct.TYPES.USHORT, "maxBonesPerStrip")
  .addMember(StudioStruct.TYPES.USHORT, "maxBonesPerTri")
  .addMember(StudioStruct.TYPES.INT, "maxBonesPerVert")
  .addMember(StudioStruct.TYPES.INT, "checkSum")
  .addMember(StudioStruct.TYPES.INT, "numLODs")
  .addMember(StudioStruct.TYPES.INT, "materialReplacementListOffset")
  .addMember(StudioStruct.TYPES.INT, "numBodyParts")
  .addMember(StudioStruct.TYPES.INT, "bodyPartOffset")
  .addArray(BodyPartHeader_t, "bodyParts", "bodyPartOffset", "numBodyParts");

module.exports = {
  FileHeader_t
}
},{"structron":15}],13:[function(require,module,exports){
const StudioStruct = require("structron");

/**
 * Structures based on /src/public/studio.h
 */

const MAX_NUM_LODS = 8;
const MAX_NUM_BONES_PER_VERT = 3;

const Vector = new StudioStruct()
  .addMember(StudioStruct.TYPES.FLOAT, "x")
  .addMember(StudioStruct.TYPES.FLOAT, "y")
  .addMember(StudioStruct.TYPES.FLOAT, "z");

const Vector2 = new StudioStruct()
  .addMember(StudioStruct.TYPES.FLOAT, "x")
  .addMember(StudioStruct.TYPES.FLOAT, "y");

const Quaternion = new StudioStruct()
  .addMember(StudioStruct.TYPES.FLOAT, "x")
  .addMember(StudioStruct.TYPES.FLOAT, "y")
  .addMember(StudioStruct.TYPES.FLOAT, "z")
  .addMember(StudioStruct.TYPES.FLOAT, "w");

const matrix3x4_t = new StudioStruct()
  .addMember(Vector, "col0")
  .addMember(Vector, "col1")
  .addMember(Vector, "col2")
  .addMember(Vector, "col3")

const mstudiotexture_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "name_offset")
  .addMember(StudioStruct.TYPES.INT, "flags")
  .addMember(StudioStruct.TYPES.INT, "used")
  .addMember(StudioStruct.TYPES.INT, "unused")
  .addMember(StudioStruct.TYPES.INT, "material")
  .addMember(StudioStruct.TYPES.INT, "client_material")
  .addMember(StudioStruct.TYPES.SKIP(40), "unused2")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "name", "name_offset", true);

const mstudioboneweight_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.FLOAT, "weight0")
  .addMember(StudioStruct.TYPES.FLOAT, "weight1")
  .addMember(StudioStruct.TYPES.FLOAT, "weight2")
  .addMember(StudioStruct.TYPES.CHAR, "BONE0")
  .addMember(StudioStruct.TYPES.CHAR, "BONE1")
  .addMember(StudioStruct.TYPES.CHAR, "BONE2")
  .addMember(StudioStruct.TYPES.CHAR, "numbones")

const mstudiovertex_t = new StudioStruct()
  .addMember(mstudioboneweight_t, "m_BoneWeights")
  .addMember(Vector, "m_vecPosition")
  .addMember(Vector, "m_vecNormal")
  .addMember(Vector2, "m_vecTexCoord")

const mstudio_meshvertexdata_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "modelvertexdata")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes0")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes1")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes2")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes3")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes4")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes5")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes6")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes7");

const mstudiomesh_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "material")
  .addMember(StudioStruct.TYPES.INT, "modelindex")
  .addMember(StudioStruct.TYPES.INT, "numvertices")
  .addMember(StudioStruct.TYPES.INT, "vertexoffset")
  .addMember(StudioStruct.TYPES.INT, "numflexes")
  .addMember(StudioStruct.TYPES.INT, "flexindex")
  .addMember(StudioStruct.TYPES.INT, "materialtype")
  .addMember(StudioStruct.TYPES.INT, "materialparam")
  .addMember(StudioStruct.TYPES.INT, "meshid")
  .addMember(Vector, "center")
  .addMember(mstudio_meshvertexdata_t, "vertexdata")
  .addMember(StudioStruct.TYPES.SKIP(32), "unused");

// Index of string array
const stringIndex = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "name_offset")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "name", "name_offset");

const mstudio_modelvertexdata_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "pVertexData")
  .addMember(StudioStruct.TYPES.INT, "pTangentData");

const mstudiomodel_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.STRING(64), "name")
  .addMember(StudioStruct.TYPES.INT, "type")
  .addMember(StudioStruct.TYPES.FLOAT, "boundingradius")
  .addMember(StudioStruct.TYPES.INT, "nummeshes")
  .addMember(StudioStruct.TYPES.INT, "meshindex")
  .addMember(StudioStruct.TYPES.INT, "numvertices")
  .addMember(StudioStruct.TYPES.INT, "vertexindex")
  .addMember(StudioStruct.TYPES.INT, "tangentindex")
  .addMember(StudioStruct.TYPES.INT, "numattachments")
  .addMember(StudioStruct.TYPES.INT, "attachmentindex")
  .addMember(StudioStruct.TYPES.INT, "numeyeballs")
  .addMember(StudioStruct.TYPES.INT, "eyeballindex")
  .addMember(mstudio_modelvertexdata_t, "vertexdata")
  .addMember(StudioStruct.TYPES.SKIP(32), "unused")
  .addArray(mstudiomesh_t, "meshes", "meshindex", "nummeshes", true)

const mstudiobodyparts_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "name_offset")
  .addMember(StudioStruct.TYPES.INT, "model_number")
  .addMember(StudioStruct.TYPES.INT, "base")
  .addMember(StudioStruct.TYPES.INT, "model_index")
  .addArray(mstudiomodel_t, "models", "model_index", "model_number", true)
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "name", "name_offset", true)

const mstudiobone_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "sznameindex")
  .addMember(StudioStruct.TYPES.INT, "parent")
  .addMember(StudioStruct.TYPES.INT, "bonecontroller0")
  .addMember(StudioStruct.TYPES.INT, "bonecontroller1")
  .addMember(StudioStruct.TYPES.INT, "bonecontroller2")
  .addMember(StudioStruct.TYPES.INT, "bonecontroller3")
  .addMember(StudioStruct.TYPES.INT, "bonecontroller4")
  .addMember(StudioStruct.TYPES.INT, "bonecontroller5")
  .addMember(Vector, "pos")
  .addMember(Quaternion, "quat")
  .addMember(Vector, "rot")
  .addMember(Vector, "posscale")
  .addMember(Vector, "rotscale")
  .addMember(matrix3x4_t, "poseToBone")
  .addMember(Quaternion, "qAlignment")
  .addMember(StudioStruct.TYPES.INT, "flags")
  .addMember(StudioStruct.TYPES.INT, "proctype")
  .addMember(StudioStruct.TYPES.INT, "procindex")
  .addMember(StudioStruct.TYPES.INT, "physicsbone")
  .addMember(StudioStruct.TYPES.INT, "surfacepropidx")
  .addMember(StudioStruct.TYPES.INT, "contents")
  .addMember(StudioStruct.TYPES.SKIP(32), "unused")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "name", "sznameindex", true)
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "surfaceprop", "surfacepropidx", true);

const mstudiobbox_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "bone")
  .addMember(StudioStruct.TYPES.INT, "group")
  .addMember(Vector, "bbmin")
  .addMember(Vector, "bbmax")
  .addMember(StudioStruct.TYPES.INT, "szhitboxnameindex")
  .addMember(StudioStruct.TYPES.SKIP(32), "unused")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "name", "szhitboxnameindex", true);

const mstudiohitboxset_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "sznameindex")
  .addMember(StudioStruct.TYPES.INT, "numhitboxes")
  .addMember(StudioStruct.TYPES.INT, "hitboxindex")
  .addArray(mstudiobbox_t, "hitboxes", "hitboxindex", "numhitboxes", true)
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "name", "sznameindex", true);

const mstudiobonecontroller_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "bone")
  .addMember(StudioStruct.TYPES.INT, "type")
  .addMember(StudioStruct.TYPES.FLOAT, "start")
  .addMember(StudioStruct.TYPES.FLOAT, "end")
  .addMember(StudioStruct.TYPES.INT, "rest")
  .addMember(StudioStruct.TYPES.INT, "inputfield")
  .addMember(StudioStruct.TYPES.SKIP(32), "unused");

const mstudiomovement_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "endframe")
  .addMember(StudioStruct.TYPES.INT, "motionflags")
  .addMember(StudioStruct.TYPES.FLOAT, "v0")
  .addMember(StudioStruct.TYPES.FLOAT, "v1")
  .addMember(StudioStruct.TYPES.FLOAT, "angle")
  .addMember(Vector, "vector")
  .addMember(Vector, "position")

const mstudioikrule_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "index")
  .addMember(StudioStruct.TYPES.INT, "type")
  .addMember(StudioStruct.TYPES.INT, "chain")
  .addMember(StudioStruct.TYPES.INT, "bone")
  .addMember(StudioStruct.TYPES.INT, "slot")
  .addMember(StudioStruct.TYPES.FLOAT, "height")
  .addMember(StudioStruct.TYPES.FLOAT, "radius")
  .addMember(StudioStruct.TYPES.FLOAT, "floor")
  .addMember(Vector, "pos")
  .addMember(Quaternion, "q")
  .addMember(StudioStruct.TYPES.INT, "compressedikerrorindex")
  .addMember(StudioStruct.TYPES.INT, "unused2")
  .addMember(StudioStruct.TYPES.INT, "iStart")
  .addMember(StudioStruct.TYPES.INT, "ikerrorindex")
  .addMember(StudioStruct.TYPES.FLOAT, "start")
  .addMember(StudioStruct.TYPES.FLOAT, "peak")
  .addMember(StudioStruct.TYPES.FLOAT, "tail")
  .addMember(StudioStruct.TYPES.FLOAT, "end")
  .addMember(StudioStruct.TYPES.FLOAT, "unused3")
  .addMember(StudioStruct.TYPES.FLOAT, "contact")
  .addMember(StudioStruct.TYPES.FLOAT, "drop")
  .addMember(StudioStruct.TYPES.FLOAT, "top")
  .addMember(StudioStruct.TYPES.INT, "unused6")
  .addMember(StudioStruct.TYPES.INT, "unused7")
  .addMember(StudioStruct.TYPES.INT, "unused8")
  .addMember(StudioStruct.TYPES.INT, "szattachmentindex")
  .addMember(StudioStruct.TYPES.SKIP(7*4), "unused")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "worldAttachment", "szattachmentindex");

const mstudiolocalhierarchy_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "iBone")
  .addMember(StudioStruct.TYPES.INT, "iNewParent")
  .addMember(StudioStruct.TYPES.FLOAT, "start")
  .addMember(StudioStruct.TYPES.FLOAT, "peak")
  .addMember(StudioStruct.TYPES.FLOAT, "tail")
  .addMember(StudioStruct.TYPES.FLOAT, "end")
  .addMember(StudioStruct.TYPES.INT, "iStart")
  .addMember(StudioStruct.TYPES.INT, "localanimindex")
  .addMember(StudioStruct.TYPES.SKIP(32));

const mstudioanimsections_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "animblock")
  .addMember(StudioStruct.TYPES.INT, "animindex");

const mstudioanimdesc_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "baseptr")
  .addMember(StudioStruct.TYPES.INT, "sznameindex")
  .addMember(StudioStruct.TYPES.FLOAT, "fps")
  .addMember(StudioStruct.TYPES.INT, "flags")
  .addMember(StudioStruct.TYPES.INT, "numframes")
  .addMember(StudioStruct.TYPES.INT, "nummovements")
  .addMember(StudioStruct.TYPES.INT, "movementindex")
  .addMember(StudioStruct.TYPES.SKIP(24), "unused")
  .addMember(StudioStruct.TYPES.INT, "animblock")
  .addMember(StudioStruct.TYPES.INT, "animindex")
  .addMember(StudioStruct.TYPES.INT, "numikrules")
  .addMember(StudioStruct.TYPES.INT, "ikruleindex")
  .addMember(StudioStruct.TYPES.INT, "animblockikruleindex")
  .addMember(StudioStruct.TYPES.INT, "numlocalhierarchy")
  .addMember(StudioStruct.TYPES.INT, "localhierarchyindex")
  .addMember(StudioStruct.TYPES.INT, "sectionindex")
  .addMember(StudioStruct.TYPES.INT, "sectionframes")
  .addMember(StudioStruct.TYPES.SHORT, "zeroframespan")
  .addMember(StudioStruct.TYPES.SHORT, "zeroframecount")
  .addMember(StudioStruct.TYPES.INT, "zeroframeindex")
  .addMember(StudioStruct.TYPES.FLOAT, "zeroframestalltime")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "name", "sznameindex", true)
  .addArray(mstudiomovement_t, "movements", "movementindex", "nummovements", true) // Don't know if this is relative (Did not find a model to test with)
  .addArray(mstudioikrule_t, "ikrules", "ikruleindex", "numikrules", true) // Same. Don't know if index is offset
  .addArray(mstudiolocalhierarchy_t, "localhierarchy", "localhierarchyindex", "numlocalhierarchy", true) // Relative !?
  .addArray(mstudioanimsections_t, "sections", "sectionindex", "sectionframes", true);

const mstudioevent_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.FLOAT, "cycle")
  .addMember(StudioStruct.TYPES.INT, "event")
  .addMember(StudioStruct.TYPES.INT, "type")
  .addMember(StudioStruct.TYPES.SKIP(64), "options")
  .addMember(StudioStruct.TYPES.INT, "szeventindex")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "event", "szeventindex", true)
  .addArray(StudioStruct.TYPES.BYTE, "options", 12, 64, true);

const mstudioautolayer_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.SHORT, "iSequence")
  .addMember(StudioStruct.TYPES.SHORT, "iPose")
  .addMember(StudioStruct.TYPES.INT, "flags")
  .addMember(StudioStruct.TYPES.FLOAT, "start")
  .addMember(StudioStruct.TYPES.FLOAT, "peak")
  .addMember(StudioStruct.TYPES.FLOAT, "tail")
  .addMember(StudioStruct.TYPES.FLOAT, "end")

const mstudioiklock_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "chain")
  .addMember(StudioStruct.TYPES.FLOAT, "flPosWeight")
  .addMember(StudioStruct.TYPES.FLOAT, "flLocalQWeight")
  .addMember(StudioStruct.TYPES.INT, "flags")
  .addMember(StudioStruct.TYPES.SKIP(32), "unused")

const mstudioseqdesc_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "baseptr")
  .addMember(StudioStruct.TYPES.INT, "szlabelindex")
  .addMember(StudioStruct.TYPES.INT, "szactivitynameindex")
  .addMember(StudioStruct.TYPES.INT, "flags")
  .addMember(StudioStruct.TYPES.INT, "activity")
  .addMember(StudioStruct.TYPES.INT, "actweight")
  .addMember(StudioStruct.TYPES.INT, "numevents")
  .addMember(StudioStruct.TYPES.INT, "eventindex")
  .addMember(Vector, "bbmin")
  .addMember(Vector, "bbmax")
  .addMember(StudioStruct.TYPES.INT, "numblends")
  .addMember(StudioStruct.TYPES.INT, "animindexindex")
  .addMember(StudioStruct.TYPES.INT, "movementindex")
  .addMember(StudioStruct.TYPES.INT, "groupsize0")
  .addMember(StudioStruct.TYPES.INT, "groupsize1")
  .addMember(StudioStruct.TYPES.INT, "paramindex0")
  .addMember(StudioStruct.TYPES.INT, "paramindex1")
  .addMember(StudioStruct.TYPES.FLOAT, "paramstart0")
  .addMember(StudioStruct.TYPES.FLOAT, "paramstart1")
  .addMember(StudioStruct.TYPES.FLOAT, "paramend0")
  .addMember(StudioStruct.TYPES.FLOAT, "paramend1")
  .addMember(StudioStruct.TYPES.INT, "paramparent")
  .addMember(StudioStruct.TYPES.FLOAT, "fadeintime")
  .addMember(StudioStruct.TYPES.FLOAT, "fadeouttime")
  .addMember(StudioStruct.TYPES.INT, "localentrynode")
  .addMember(StudioStruct.TYPES.INT, "localexitnode")
  .addMember(StudioStruct.TYPES.INT, "nodeflags")
  .addMember(StudioStruct.TYPES.FLOAT, "entryphase")
  .addMember(StudioStruct.TYPES.FLOAT, "exitphase")
  .addMember(StudioStruct.TYPES.FLOAT, "lastframe")
  .addMember(StudioStruct.TYPES.INT, "nextseq")
  .addMember(StudioStruct.TYPES.INT, "pose")
  .addMember(StudioStruct.TYPES.INT, "numikrules")
  .addMember(StudioStruct.TYPES.INT, "numautolayers")
  .addMember(StudioStruct.TYPES.INT, "autolayerindex")
  .addMember(StudioStruct.TYPES.INT, "weightlistindex")
  .addMember(StudioStruct.TYPES.INT, "posekeyindex")
  .addMember(StudioStruct.TYPES.INT, "numiklocks")
  .addMember(StudioStruct.TYPES.INT, "iklockindex")
  .addMember(StudioStruct.TYPES.INT, "keyvalueindex")
  .addMember(StudioStruct.TYPES.INT, "keyvaluesize")
  .addMember(StudioStruct.TYPES.INT, "cycleposeindex")
  .addMember(StudioStruct.TYPES.SKIP(4*7), "unused")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "label", "szlabelindex", true)
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "activityname", "szactivitynameindex", true)
  .addArray(mstudioevent_t, "events", "eventindex", "numevents", true)
  .addArray(mstudioautolayer_t, "autolayer", "autolayerindex", "numautolayers", true)
  .addArray(mstudioiklock_t, "iklockindex", "numiklocks");
  /**
   * @todo Allow functions in array parameters
   */
  //.addArray(StudioStruct.TYPES.SHORT, "anims", "animindex", data => data.groupsize[0] * data.groupsize[1])

const mstudioattachment_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "sznameindex")
  .addMember(StudioStruct.TYPES.UINT, "flags")
  .addMember(StudioStruct.TYPES.INT, "localbone")
  .addMember(matrix3x4_t, "local")
  .addMember(StudioStruct.TYPES.SKIP(32), "unused")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "name", "sznameindex", true);

const mstudiomodelgroup_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "szlabelindex")
  .addMember(StudioStruct.TYPES.INT, "sznameindex")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "label", "szlabelindex", true)
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "name", "sznameindex", true);

const mstudioposeparamdesc_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "sznameindex")
  .addMember(StudioStruct.TYPES.UINT, "flags")
  .addMember(StudioStruct.TYPES.FLOAT, "start")
  .addMember(StudioStruct.TYPES.FLOAT, "end")
  .addMember(StudioStruct.TYPES.FLOAT, "loop")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "name", "sznameindex", true);

const studiohdr_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "id")
  .addMember(StudioStruct.TYPES.INT, "version")
  .addMember(StudioStruct.TYPES.INT, "checksum")
  .addMember(StudioStruct.TYPES.STRING(64), "name")
  .addMember(StudioStruct.TYPES.INT, "dataLength")
  .addMember(Vector, "eyeposition")
  .addMember(Vector, "illumposition")
  .addMember(Vector, "hull_min")
  .addMember(Vector, "hull_max")
  .addMember(Vector, "view_bbmin")
  .addMember(Vector, "view_bbmax")
  .addMember(StudioStruct.TYPES.INT, "flags")
  .addMember(StudioStruct.TYPES.INT, "bone_count")
  .addMember(StudioStruct.TYPES.INT, "bone_index")
  .addMember(StudioStruct.TYPES.INT, "bonecontroller_count")
  .addMember(StudioStruct.TYPES.INT, "bonecontroller_offset")
  .addMember(StudioStruct.TYPES.INT, "hitbox_count")
  .addMember(StudioStruct.TYPES.INT, "hitbox_offset")
  .addMember(StudioStruct.TYPES.INT, "localanim_count")
  .addMember(StudioStruct.TYPES.INT, "localanim_offset")
  .addMember(StudioStruct.TYPES.INT, "localseq_count")
  .addMember(StudioStruct.TYPES.INT, "localseq_offset")
  .addMember(StudioStruct.TYPES.INT, "activitylistversion")
  .addMember(StudioStruct.TYPES.INT, "eventsindexed")
  .addMember(StudioStruct.TYPES.INT, "texture_count")
  .addMember(StudioStruct.TYPES.INT, "texture_offset")
  .addMember(StudioStruct.TYPES.INT, "texturedir_count")
  .addMember(StudioStruct.TYPES.INT, "texturedir_offset")
  .addMember(StudioStruct.TYPES.INT, "skinreference_count")
  .addMember(StudioStruct.TYPES.INT, "skinfamily_count")
  .addMember(StudioStruct.TYPES.INT, "skinreference_index")
  .addMember(StudioStruct.TYPES.INT, "bodypart_count")
  .addMember(StudioStruct.TYPES.INT, "bodypart_offset")
  .addMember(StudioStruct.TYPES.INT, "attachment_count")
  .addMember(StudioStruct.TYPES.INT, "attachment_offset")
  .addMember(StudioStruct.TYPES.INT, "localnode_count")
  .addMember(StudioStruct.TYPES.INT, "localnode_index")
  .addMember(StudioStruct.TYPES.INT, "localnode_name_index")
  .addMember(StudioStruct.TYPES.INT, "flexdesc_count")
  .addMember(StudioStruct.TYPES.INT, "flexdesc_index")
  .addMember(StudioStruct.TYPES.INT, "flexcontroller_count")
  .addMember(StudioStruct.TYPES.INT, "flexcontroller_index")
  .addMember(StudioStruct.TYPES.INT, "flexrules_count")
  .addMember(StudioStruct.TYPES.INT, "flexrules_index")
  .addMember(StudioStruct.TYPES.INT, "ikchain_count")
  .addMember(StudioStruct.TYPES.INT, "ikchain_index")
  .addMember(StudioStruct.TYPES.INT, "mouths_count")
  .addMember(StudioStruct.TYPES.INT, "mouths_index")
  .addMember(StudioStruct.TYPES.INT, "localposeparam_count")
  .addMember(StudioStruct.TYPES.INT, "localposeparam_offset")
  .addMember(StudioStruct.TYPES.INT, "surfaceprop_index")
  .addMember(StudioStruct.TYPES.INT, "keyvalue_index")
  .addMember(StudioStruct.TYPES.INT, "keyvalue_count")
  .addMember(StudioStruct.TYPES.INT, "ikblock_count")
  .addMember(StudioStruct.TYPES.INT, "ikblock_index")
  .addMember(StudioStruct.TYPES.FLOAT, "mass")
  .addMember(StudioStruct.TYPES.INT, "contents")
  .addMember(StudioStruct.TYPES.INT, "includemodel_count")
  .addMember(StudioStruct.TYPES.INT, "includemodel_index")
  .addMember(StudioStruct.TYPES.INT, "virtualModel")
  .addMember(StudioStruct.TYPES.INT, "animblocks_name_index")
  .addMember(StudioStruct.TYPES.INT, "animblocks_count")
  .addMember(StudioStruct.TYPES.INT, "animblocks_index")
  .addMember(StudioStruct.TYPES.INT, "animblockModel")
  .addMember(StudioStruct.TYPES.INT, "bonetable_index")
  .addMember(StudioStruct.TYPES.INT, "vertex_base")
  .addMember(StudioStruct.TYPES.INT, "offset_base")
  .addMember(StudioStruct.TYPES.BYTE, "directionaldotproduct")
  .addMember(StudioStruct.TYPES.BYTE, "rootLod")
  .addMember(StudioStruct.TYPES.BYTE, "numAllowedRootLods")
  .addMember(StudioStruct.TYPES.SKIP(5), "unused")
  .addMember(StudioStruct.TYPES.INT, "flexcontrollerui_count")
  .addMember(StudioStruct.TYPES.INT, "flexcontrollerui_index")
  .addMember(StudioStruct.TYPES.INT, "studiohdr2index")
  .addMember(StudioStruct.TYPES.INT, "unused")
  .addArray(mstudiotexture_t, "textures", "texture_offset", "texture_count")
  .addArray(stringIndex, "texturedirs", "texturedir_offset", "texturedir_count")
  .addArray(mstudiobodyparts_t, "bodyparts", "bodypart_offset", "bodypart_count")
  .addArray(mstudiobone_t, "bones", "bone_index", "bone_count")
  .addArray(mstudiohitboxset_t, "hitboxes", "hitbox_offset", "hitbox_count")
  .addArray(mstudiobonecontroller_t, "bonecontroller", "bonecontroller_offset", "bonecontroller_count")
  .addArray(mstudioanimdesc_t, "localanims", "localanim_offset", "localanim_count")
  .addArray(mstudioseqdesc_t, "sequences", "localseq_offset", "localseq_count")
  .addArray(mstudioattachment_t, "attachments", "attachment_offset", "attachment_count")
  .addArray(mstudioiklock_t, "iklocks", "iklock_index", "iklock_count")
  .addArray(mstudiomodelgroup_t, "includemodel_index", "animblocks_count")
  .addArray(StudioStruct.TYPES.SHORT, "skinreferences", "skinreference_index", "skinreference_count")
  .addArray(mstudioposeparamdesc_t, "localposeparams", "localposeparam_offset", "localposeparam_count")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "surfaceProp", "surfaceprop_index")
  .addReference(StudioStruct.TYPES.NULL_TERMINATED_STRING(), "keyvalue", "keyvalue_index");

const vertexFileFixup_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "lod")
  .addMember(StudioStruct.TYPES.INT, "sourceVertexId")
  .addMember(StudioStruct.TYPES.INT, "numVertexes");

const vertexFileHeader_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.INT, "id")
  .addMember(StudioStruct.TYPES.INT, "version")
  .addMember(StudioStruct.TYPES.INT, "checksum")
  .addMember(StudioStruct.TYPES.INT, "numLODs")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes0")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes1")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes2")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes3")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes4")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes5")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes6")
  .addMember(StudioStruct.TYPES.INT, "numLODVertexes7")
  .addMember(StudioStruct.TYPES.INT, "numFixups")
  .addMember(StudioStruct.TYPES.INT, "fixupTableStart")
  .addMember(StudioStruct.TYPES.INT, "vertexDataStart")
  .addMember(StudioStruct.TYPES.INT, "tangentDataStart")
  .addArray(vertexFileFixup_t, "fixups", "fixupTableStart", "numFixups");

module.exports = {
  studiohdr_t,
  vertexFileHeader_t,
  mstudiovertex_t
}

},{"structron":15}],14:[function(require,module,exports){
(function (Buffer){
/** 
 *  @class Report
 *  @type {Object}
 *  @property {Object} data The exported data.
 */

class Report {

  constructor(buffer, options) {
    this.buffer = buffer;
    
    this.monitorUsage = Boolean(options.monitorUsage);
    this.hideReferenceValues = Boolean(options.hideReferenceValues)

    if (this.monitorUsage) {
      this.usageBuffer = Buffer.alloc(buffer.length);
    }

    // Path to the current read entry
    this.path = "root";

    this.errors = [];
    this.arrays = [];
  }

  addError(message) {
    this.errors.push({
      path: this.path,
      message
    });
  }

  markAreaAsRead(start, length) {
    if (!this.monitorUsage) return;

    for (let i = start; i < start + length; i++) {
      if (this.usageBuffer[i] < 255) {
        this.usageBuffer[i]++;
      }
    }
  }

  checkForArrayCollisions() {
    for (let i = 0; i < this.arrays.length; i++) {
      let a1 = this.arrays[i];
      for (let j = i; j < this.arrays.length; j++) {
        let a2 = this.arrays[j];

        if (a1.length == 0 || a2.length == 0) continue;
        if (a1 == a2) continue;
        if (a1.start == a2.start) continue;

        if (a1.start < (a2.start + a2.length) && a2.start < (a1.start + a1.length)) {
          this.path = a1.path + "/" + a2.path;
          this.addError("Array " + a1.name + " overlaps with " + a2.name);
        }
      }
    }
  }

  toString() {
    let out = "\n===Structron-Report==="
    + "\n Buffer size: " + this.buffer.length;

    if (this.monitorUsage) {
      let bytesRead = this.getUsage();
      out += "\n Bytes read: " + bytesRead + " (" + Math.floor((bytesRead / this.buffer.length) * 100) + "%)";
    }

    out += "\n Number of arrays: " + this.arrays.length;

    if (this.errors.length) {
      out += "\n Errors (" + this.errors.length + "):\n  "
      + this.errors.map(e => e.path + ": " + e.message).join("\n  ");
    } else {
      out += "\n No errors were found."
    }
    
    return out;
  }

  getUsage() {
    if (!this.monitorUsage) return NaN;
    let number = 0;
    for (let i = 0; i < this.usageBuffer.length; i++) {
      if (this.usageBuffer[i] > 0) number++;
    }
    return number;
  }

}

module.exports = Report;
}).call(this,require("buffer").Buffer)
},{"buffer":2}],15:[function(require,module,exports){
const Report = require('./Report.js');

class Struct {

  /**
   * Creates a new struct definition
   * @param {=String} name Optional name. Only used for debugging purposes
   */
  constructor(name = "") {
    this.members = [];
    this.arrays = [];
    this.references = [];
    this.rules = [];
    this.name = name;
  }

  /**
   * Adds a member to load
   * @param {Type} type Datatype of the member to load
   * @param {String} name Name of the member
   * @returns {Struct}
   */
  addMember(type, name) {
    if (isNaN(type.SIZE)) throw new Error("Element with no fixed size is not allowed as struct member (" + name + ")!",);

    this.members.push({type, name});
    return this;
  }

  /**
   * Adds a an array to load from values inside this struct. The order is not important
   * @param {Type} type Datatype of the member to load
   * @param {String} name Name of the member
   * @param {any} offsetMemberName Number or Name of the member which stores the address of the array
   * @param {any} countMemberName Number or name of the member which stores the length of the array
   * @param {Boolean} relative Is the address in the target member relative to the structs address?
   * @returns {Struct}
   */
  addArray(type, name, offsetMemberName, countMemberName, relative = false) {
    this.arrays.push({
      name,
      offsetMemberName,
      countMemberName,
      type,
      relative
    });
    return this;
  }

  /**
   * Adds a reference. References will appear as own members in the out data.
   * @param {*} type Type of the reference
   * @param {String} name Name of the new data member
   * @param {String} membername Name of the address containg existing data member
   * @param {Boolean} relative Is the adress relative to the structs address?
   * @returns {Struct}
   */
  addReference(type, name, memberName, relative = false) {
    this.references.push({
      type,
      name,
      memberName,
      relative
    });
    return this;
  }

  /**
   * Adds a rule. Rules give extra validation options
   * @returns {Struct} itself
   */
  addRule(rule) {
    this.rules.push({
      rule
    });
    return this;
  }

  /**
   * Converts a buffer to an object with the structs structure
   * @param {Buffer} buffer Buffer to read from
   * @param {=Number} offset Offset byte to start reading from
   */
  read(buffer, offset = 0, report = null) {
    let data = {};
    let address = offset;

    if (!report) report = new Report({}, buffer);

    let path = report.path;

    for (let member of this.members) {
      report.path = path + "." + member.name;
      data[member.name] = member.type.read(buffer, address, report);
      address += member.type.SIZE;
    }


    for (let array of this.arrays) {
      let arrayOffset = (typeof array.offsetMemberName == 'string') ? data[array.offsetMemberName] : array.offsetMemberName;
      let arrayCount = (typeof array.countMemberName == 'string') ? data[array.countMemberName] : array.countMemberName;

      if (array.relative) arrayOffset += offset;

      let arr = [];
      for (let i = 0; i < arrayCount; i++) {
        report.path = path + "." + array.name + "[" + i + "]";
        arr.push(
          array.type.read(buffer, arrayOffset + i * array.type.SIZE, report)
        );
      }

      // Does double mark some fields that are only read once :/
      report.markAreaAsRead(arrayOffset, arrayCount * array.type.SIZE);

      data[array.name] = arr;

      if (report) {
        report.arrays.push({
          name: array.name,
          start: arrayOffset, 
          count: arrayCount, 
          length: arrayCount * array.type.SIZE,
          path: path + "." + array.name
        });
      }
    }

    for (let reference of this.references) {
      report.path = path + "." + reference.name;

      try {
        let referenceOffset = data[reference.memberName];
        if (reference.relative) referenceOffset += offset;
        data[reference.name] = reference.type.read(buffer, referenceOffset, report);
      } catch (e) {
        report.addError(e.message);
      }
    }

    for (let i = 0; i < this.rules.length; i++) {
      let rule = this.rules[i];
      let response = rule.rule(data, buffer);
      if (response) {
        report.path = path + ":rule[" + i + "]";
        report.addError(response);
      }
    }

    if (report) {
      report.markAreaAsRead(offset, this.SIZE);

      if (report.hideReferenceValues) {
        // Remove all values that are only used as pointers or other data structure data to keep the result clean
        for (let array of this.arrays) {
          if (typeof array.offsetMemberName == 'string') delete data[array.offsetMemberName];
          if (typeof array.countMemberName == 'string') delete data[array.countMemberName];
        }
        for (let reference of this.references) {
          if (typeof reference.memberName == 'string') delete data[reference.memberName];
        }
      }
    }

    return data;
  }

  /**
   * backward compatibility. Use .read instead! 
   */
  import() {
    this.read(...arguments);
  }

  /**
   * Returns an report object. It will contain the extracted data as well as some statistics like how many bytes were read and what errors occoured.
   * @param {*} buffer Buffer to read from
   * @param {*} offset Offset byte to start reading from
   * @returns {Report} The report
   */
  report(buffer, offset, options = { monitorUsage: true }) {
    let report = new Report(buffer, options);
    report.data = this.read(buffer, offset, report);

    report.checkForArrayCollisions();

    return report;
  }

  /**
   * Validates a structure
   * @param {Buffer} buffer Buffer to read from
   * @param {Number} offset Byte offset in the buffer to begin reading from
   * @returns {Boolean} True when valid 
   */
  validate(buffer, offset = 0) {
    try {
      this.read(buffer, offset)
      return true;
    } catch (e) {
      return false;
    }
  }

  get SIZE() {
    return this.members.reduce((val, member) => val + member.type.SIZE, 0);
  }

  getOffsetByName(name) {
    let address = 0;
    for (let member of this.members) {
      if (member.name == name) return address;
      address += member.type.SIZE
    }
    return NaN;
  }

}

Struct.TYPES = require('./types.js');
Struct.RULES = require('./rules.js');

module.exports = Struct;

},{"./Report.js":14,"./rules.js":16,"./types.js":17}],16:[function(require,module,exports){
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
},{}],17:[function(require,module,exports){
/**
 * Inbuilt types
 */

module.exports = {
  /* 
   * Signed 4 byte LE Integer 
   */
  INT: {
    read(buffer, offset) {
      return buffer.readInt32LE(offset)
    },
    SIZE: 4
  },

  /**
   * Unsigned 4 byte LE integer
   */
  UINT: {
    read(buffer, offset) {
      return buffer.readUInt32LE(offset)
    },
    SIZE: 4
  },

  /**
   * Signed 16 bit LE integer
   */
  SHORT: {
    read(buffer, offset) {
      return buffer.readInt16LE(offset)
    },
    SIZE: 2
  },

  /**
   * Unsigned 16 bit LE integer
   */
  USHORT: {
    read(buffer, offset) {
      return buffer.readUInt16LE(offset)
    },
    SIZE: 2
  },

  /**
   * 4 Byte LE float
   */
  FLOAT: {
    read(buffer, offset) {
      return buffer.readFloatLE(offset)
    },
    SIZE: 4
  },

  /**
   * 1 Byte char
   */
  CHAR: {
    read(buffer, offset) {
      return buffer.readUInt8(offset)
    },
    SIZE: 1
  },

  /**
   * Unsigned 8 bit int
   */
  BYTE: {
    read(buffer, offset) {
      return buffer.readUInt8(offset)
    },
    SIZE: 1
  },

  /**
   * String with fixed Length
   * @param {Number} length Length to read
   * @param {=String} encoding Codec to use. Anything that is supported by buffer.toString()
   */
  STRING(length, encoding = "ascii") {
    return {
      read(buffer, offset) {
        return buffer.toString(encoding, offset, offset + length).replace(/\0/g, '');
      },
      SIZE: length
    }
  },

  /**
   * Null terminated string. Don't use this type in a struct. Only as reference!
   * @param {=String} encoding Codec to use. Anything that is supported by buffer.toString()
   */
  NULL_TERMINATED_STRING(encoding = "ascii") {
    return {
      read(buffer, offset, report = null) {
        let len = 0;
        while (buffer.readUInt8(offset + len) != 0) {
          len++;
          if (len >= buffer.length) {
            throw new Error("Null terminated string went outside buffer!");
          }
        }

        // Also report last byte as used information
        if (report) {
          report.markAreaAsRead(offset, len + 1)
        }

        return buffer.toString(encoding, offset, offset + len);
      },
      SIZE: NaN
    }
  },

  /**
   * Skips a given amount of bytes
   * @param {Number} length Number of bytes to skip
   */
  SKIP(length) {
    return {
      read() { return null },
      SIZE: length
    }
  }
}
},{}]},{},[4]);
