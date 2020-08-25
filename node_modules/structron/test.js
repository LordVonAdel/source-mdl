const Struct = require('./index.js');


function testImage() {
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
    .addReference(Struct.TYPES.NULL_TERMINATED_STRING(), "name", "nameIndex")
    .addArray(Pixel, "pixels", "pixelOffset", "pixelNumber");

  let data = Buffer.alloc(85);
  data.writeInt32LE(0x24011999, 0);
  data.writeInt32LE(4, 4);
  data.writeInt32LE(4, 8);
  data.writeInt32LE(32, 12);
  data.writeInt32LE(16, 16);
  data.writeInt32LE(80, 20); // Name address
  // Skip 24 and 28
  for (let i = 32; i < 80; i++) {
    data.writeUInt8((i * 9) % 255, i);
  }
  data.writeInt8(0x54, 80);
  data.writeInt8(0x69, 81);
  data.writeInt8(0x6e, 82);
  data.writeInt8(0x61, 83);

  return JSON.stringify(Image.report(data).data) == `{"magicNumber":604051865,"size":{"width":4,"height":4},"pixelOffset":32,"pixelNumber":16,"nameIndex":80,"unused":null,"pixels":[{"color":{"r":1,"g":33,"b":1},"alpha":51},{"color":{"r":28,"g":60,"b":28},"alpha":78},{"color":{"r":23,"g":23,"b":23},"alpha":105},{"color":{"r":18,"g":50,"b":18},"alpha":132},{"color":{"r":13,"g":13,"b":13},"alpha":159},{"color":{"r":8,"g":40,"b":8},"alpha":186},{"color":{"r":3,"g":3,"b":3},"alpha":213},{"color":{"r":30,"g":30,"b":30},"alpha":240},{"color":{"r":25,"g":57,"b":25},"alpha":12},{"color":{"r":21,"g":21,"b":21},"alpha":39},{"color":{"r":16,"g":48,"b":16},"alpha":66},{"color":{"r":11,"g":11,"b":11},"alpha":93},{"color":{"r":6,"g":38,"b":6},"alpha":120},{"color":{"r":1,"g":1,"b":1},"alpha":147},{"color":{"r":28,"g":28,"b":28},"alpha":174},{"color":{"r":23,"g":55,"b":23},"alpha":201}],"name":"Tina"}`
}

/**
 * Tests overlapping arrays and usage
 */
function testOverlappingArrays() {
  let buffer = Buffer.alloc(64);

  buffer.writeUInt8(16, 0);
  buffer.writeUInt8(48, 1);
  buffer.writeUInt8(32, 2);
  buffer.writeUInt8(16, 3);

  let testStruct = new Struct()
    .addMember(Struct.TYPES.BYTE, "aPos")
    .addMember(Struct.TYPES.BYTE, "aLen")
    .addMember(Struct.TYPES.BYTE, "bPos")
    .addMember(Struct.TYPES.BYTE, "bLen")
    .addArray(Struct.TYPES.BYTE, "a", "aPos", "aLen")
    .addArray(Struct.TYPES.BYTE, "b", "bPos", "bLen");

  let report = testStruct.report(buffer);
  return report.errors.length == 1 && report.getUsage() == 52;
}

function testRuleEqual() {
  let buffer = Buffer.alloc(64);
  buffer.writeUInt32LE(0x12657832, 0);

  let testStruct = new Struct()
    .addMember(Struct.TYPES.UINT, "magic")
    .addRule(Struct.RULES.EQUAL("magic", 308639794))
    .addRule(Struct.RULES.EQUAL("magic", 42));

  let report = testStruct.report(buffer);
  return report.errors.length == 1;
}

console.log("Image test:", testImage());
console.log("Overlapping arrays:", testOverlappingArrays());
console.log("Equal rule Test:", testRuleEqual());