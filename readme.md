# Source MDL

This package can read source engines MDL files. To parse a model, it needs the VTX, VVD and MDL file.

It may not work with every model. It was tested with models from Portal 2.

After the model was imported, it can be exported in GLTF format. This conversion is lossy. Prop data like surface property, mouths, eyes and special source stuff will not be exported.

Currently it does not support bones or animations!

## Demo
Check out an online working [demo](https://lordvonadel.github.io/source-mdl/)

## How to use
```js
const MDL = require('./src/MDL.js');
const fs = require('fs').promises;

(async () => {
  // Read files or get the buffers from somewhere else
  let mdlData = await fs.readFile('./test/candles.mdl');
  let vtxData = await fs.readFile('./test/candles.dx90.vtx');
  let vvdData = await fs.readFile('./test/candles.vvd');

  // Create an MDL instance
  let model = new MDL();

  // Import the three buffers
  model.import({mdlData, vtxData, vvdData});

  // If you want, look at some metadata
  console.log(model.getMetadata());

  // Export as GLTF
  await fs.writeFile("test/test.gltf", JSON.stringify(model.toGLTF()));

  // Export as OBJ
  await fs.writeFile("test/test.obj", model.toObj());

  // You can import only the MDL buffer if you are only interested in metadata without geometry
  let modelNoGeometry = new MDL();
  modelNoGeometry.import({mdlData});
  console.log(model.getMetadata());
})();
```

## Export
This module can convert MDL to different formats.
| Format                                                    | Geometry    | UVs | Armature | Animations
| ----------------------------------------------------------|-------------|-----|----------|-----------
| GLTF                                                      | Yes         | Yes | No       | No
| OBJ                                                       | Yes         | Yes | No       | No
| XMODEL (exporter by [johndoe](https://github.com/myuce/)) | Yes         | Yes | No       | No

Or you can create your own exporter with the object obtained by `model.getData()` or use an external GLTF/OBJ to anything converter.