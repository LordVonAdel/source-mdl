const MDL = require('./src/MDL.js');
const fs = require('fs');

let model = new MDL();

fs.readFile('./test/candles.mdl', (err, mdlData) => {
  if (err) return console.error(err);
  
  fs.readFile('./test/candles.dx90.vtx', (err, vtxData) => {
    if (err) return console.error(err);
    
    fs.readFile('./test/candles.vvd', (err, vvdData) => {
      model.import({mdlData, vtxData, vvdData});
      console.log(model.getMetadata());

      console.log(model.toData());
      fs.writeFileSync("test/test.gltf", JSON.stringify(model.toGLTF()));
      fs.writeFileSync("test/test.obj", model.toObj());
    });
  });
});