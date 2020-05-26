const MDL = require('./src/MDL.js');
const fs = require('fs');

let model = new MDL();

fs.readFile('./test/turret.mdl', (err, mdlData) => {
  if (err) return console.error(err);
  
  fs.readFile('./test/turret.dx90.vtx', (err, vtxData) => {
    if (err) return console.error(err);
    
    fs.readFile('./test/turret.vvd', (err, vvdData) => {
      model.import({mdlData, vtxData, vvdData});
      console.log(model.getMetadata());

      fs.writeFileSync("test/test.gltf", JSON.stringify(model.toGLTF()));
    });
  });
});