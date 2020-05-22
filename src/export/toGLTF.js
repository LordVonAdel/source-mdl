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