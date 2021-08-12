const MDL = require('./src/MDL.js');
const fs = require('fs').promises;

(async () => {
  let mdlData = await fs.readFile('./test/candles.mdl');
  let vtxData = await fs.readFile('./test/candles.dx90.vtx');
  let vvdData = await fs.readFile('./test/candles.vvd');

  let model = new MDL();
  model.import({mdlData, vtxData, vvdData});
  console.log(model.getMetadata());
  console.log(model.toData());

  await fs.writeFile("test/test.gltf", JSON.stringify(model.toGLTF()));
  await fs.writeFile("test/test.obj", model.toObj());

  let modelNoGeometry = new MDL();
  modelNoGeometry.import({mdlData});
  console.log(modelNoGeometry.getMetadata());
  try {
    modelNoGeometry.toGLTF();
  } catch (e) {
    console.log("Worked fine!");
  }
  
})();