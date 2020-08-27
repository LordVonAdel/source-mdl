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