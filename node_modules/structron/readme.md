# Structron
Structron is a reader for binary data. It parses buffers from in code defined models and returns the result as object.

WARNING: It currently does not support recursive structures!

## Installation
Install using [npm](https://www.npmjs.com/):
```
npm i structron
```

## Example
Example of reading a custom image format with the following structure:
```
header:
  int magicNumber   (Magic number of the file)
  Dimensions size   (Custom Data-Type of 2 ints)
  int pixelOffset   (Start address of the pixel array)
  int pixelNumber   (Pixel array size)
  int namePosition  (Pointer to a null-terminated string)
  int unused[2]     (2 unused integer reserved for later use)

pixel:
  rgb565 color      (Color values)
  byte alpha        (Opacity)
```

Reading with structron:
```js
const Struct = require('structron');

// --- First we need to define the custom datatypes ---

// Define via another struct
const Dimensions = new Struct()
  .addMember(Struct.TYPES.INT, "width")
  .addMember(Struct.TYPES.INT, "height");

// Define via custom function
const rgb565 = {
  read(buffer, offset) {
    let short = buffer.readUInt16LE(offset);
    return {
      r: short & 0b1111100000000000 >> 11,
      g: short & 0b0000011111100000 >> 5,
      b: short & 0b0000000000011111
    }
  },
  SIZE: 2 // Size in bytes
};

const Pixel = new Struct()
  .addMember(rgb565, "color")
  .addMember(Struct.TYPES.BYTE, "alpha");

// --- Then we define our file header ---
const Image = new Struct()
  .addMember(Struct.TYPES.INT, "magicNumber")
  .addMember(Dimensions, "size")
  .addMember(Struct.TYPES.INT, "pixelOffset")
  .addMember(Struct.TYPES.INT, "pixelNumber")
  .addMember(Struct.TYPES.INT, "nameIndex")
  .addMember(Struct.TYPES.SKIP(8), "unused")
  .addReference(Struct.TYPES.NULL_TERMINATED_STRING('ASCII'), "name", "nameIndex")
  .addArray(Pixel, "pixels", "pixelOffset", "pixelNumber");

// --- And now import our image ---
const data = Buffer.from("mRkBJAQAAAAEAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAhKjM8RU5XYGlye4SNlp+osbrDzNXe5/D5AwwVHicwOUJLVF1mb3iBipOcpa63wMlUaW5hAA==", "base64");

let image = Image.report(data);
console.log(image.data);
```
`image.data` will then look like this:
```json
{
  "magicNumber": 604051865,
  "size": { "width": 4, "height": 4 },
  "pixelOffset": 32,
  "pixelNumber": 16,
  "nameIndex": 80,
  "unused": null,
  "pixels":[
    { "color":{ "r":1,  "g":33, "b":1 },  "alpha":51 },
    { "color":{ "r":28, "g":60, "b":28 }, "alpha":78 },
    { "color":{ "r":23, "g":23, "b":23 }, "alpha":105 },
    { "color":{ "r":18, "g":50, "b":18 }, "alpha":132 },
    { "color":{ "r":13, "g":13, "b":13 }, "alpha":159 },
    { "color":{ "r":8,  "g":40, "b":8 },  "alpha":186 },
    { "color":{ "r":3,  "g":3,  "b":3 },  "alpha":213 },
    { "color":{ "r":30, "g":30, "b":30 }, "alpha":240 },
    { "color":{ "r":25, "g":57, "b":25 }, "alpha":12 },
    { "color":{ "r":21, "g":21, "b":21 }, "alpha":39 },
    { "color":{ "r":16, "g":48, "b":16 }, "alpha":66 },
    { "color":{ "r":11, "g":11, "b":11 }, "alpha":93 },
    { "color":{ "r":6,  "g":38, "b":6 },  "alpha":120 },
    { "color":{ "r":1,  "g":1,  "b":1 },  "alpha":147 },
    { "color":{ "r":28, "g":28, "b":28 }, "alpha":174 },
    { "color":{ "r":23, "g":55, "b":23 }, "alpha":20 1}
  ],
  "name":"Tina"
}
```

## Methods
### `struct.import(buffer, offset)`
Reads data from a buffer from a specific address on. Returns the data as object.

### `struct.validate(buffer, offset)`
Returns an boolean if the data matches the struct.

### `struct.addMember(type, name)`
Adds an member to the struct definition.

### `struct.addArray(type, name, index, length, relative)`
`type` is the type of the elements in the array. To work, the size of the elements need to be correct.

`name` is the name of the member that will be added to the output object containing the array.

`index` is the start address of the array. If a string is given, it will read the value from another member with that name.

`length` is the number of elements in the array. (Not the size in bytes!). If a string is given, it will read the value from another member with that name.

When `relative` is set to true, the array will be read from the index + the structs address.

### `struct.addReference(type, name, index, relative)`
`type` is the type of the object to reference.

`name` is the name of the member that will be added to the output object.

`index` is the start address of the elementto load. If a string is given, it will read the value from another member with that name.

When `relative` is set to true, the index is relative to the start of the parent struct.

## Inbuilt Types
These inbuilt types are accesiable with `Structron.TYPES.`

### `INT`
4 byte signed little-endian Integer

### `UINT`
4 byte unsigned little-endian Integer

### `SHORT`
2 byte signed little-endian Integer

### `USHORT`
2 byte signed little-endian Integer

### `BYTE`
Unsigned 1 byte

### `FLOAT`
4 byte little-endian Float

### `CHAR`
Same as `BYTE`

### `STRING(length, encoding)`
String with variable length. 
Supports all encodings from `buffer.toString()`.

### `NULL_TERMINATED_STRING(encoding)`
Null terminated string. Reads a string from an address until a null byte is hit.
Can't be used inside a Struct. Only as reference.
Supports all encodings from `buffer.toString()`.

### `SKIP(length)`
Skips a given amount of bytes.