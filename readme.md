# Source MDL

This package can read source engines MDL files. To parse a model, it needs the VTX, VVD and MDL file.

It may not work with every model. It was tested with models from Portal 2.

After the model was imported, it can be exported in GLTF format. This conversion is lossy. Prop data like surface property, mouths, eyes and special source stuff will not be exported.

Currently it does not support bones or animations!

## Demo
Check out an online working [demo](https://lordvonadel.github.io/source-mdl/)

## How to use
```js
const MDL = require('source-mdl');

// Create an MDL instance
let model = new MDL();

// Read files or get the buffers from somewhere else
fs.readFile('./turret.mdl', (err, mdlData) => {
  if (err) return console.error(err);
  
  fs.readFile('./turret.dx90.vtx', (err, vtxData) => {
    if (err) return console.error(err);
    
    fs.readFile('./turret.vvd', (err, vvdData) => {

      // Import the three buffers
      model.import({mdlData, vtxData, vvdData});

      // If you want, look at some metadata
      console.log(model.getMetadata());

      // Export as GLTF
      fs.writeFileSync("/turret.gltf", JSON.stringify(model.toGLTF()));

      // Export as OBJ
      fs.writeFileSync("/turret.obj", JSON.stringify(model.toOBJ()));
    });
  });
});
```

## Export
This module can convert MDL to different formats.
| Format                                                    | Geometry    | UVs | Armature | Animations
| ----------------------------------------------------------|-------------|-----|----------|-----------
| GLTF                                                      | Yes         | Yes | No       | No
| OBJ                                                       | Yes         | Yes | No       | No
| XMODEL (exporter by [johndoe](https://github.com/myuce/)) | Yes         | Yes | No       | No

Or you can create your own exporter with the object obtained by `model.getData()` or use an external GLTF/OBJ to anything converter.