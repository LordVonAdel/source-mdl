/**
 * obj specification: http://paulbourke.net/dataformats/obj/
 * The materials library is not generated. The output links to a file called like the original mdl with ".mtl" appended.
 */

module.exports = function(mdl) {
  let out = "# File generated with source-mdl (https://github.com/LordVonAdel/source-mdl)\n";
  let nameSafe = mdl.name.replace(/\\/g, "_");
  out += "mtllib " + nameSafe + ".mtl\n";
  out += "o " + nameSafe + "\n"

  const LOD_LEVEL = 0;
  let vertices = mdl.vertices[LOD_LEVEL];

  for (let vertex of vertices) {
    out += "v " + vertex.position[0] + " " + vertex.position[1] + " " + vertex.position[2] + "\n";
  }

  for (let vertex of vertices) {
    out += "vt " + vertex.texCoords[0] + " " +vertex.texCoords[1] + "\n";
  }

  for (let vertex of vertices) {
    out += "vn " + vertex.normal[0] + " " +vertex.normal[1] + " " + vertex.normal[2] + "\n";
  }

  for (let mesh of mdl.meshes[LOD_LEVEL]) {
    out += "usemtl " + mdl.textures[mesh.material] + "\n"
    for (let i = 0; i < mesh.indices.length; i += 3) {
      out += "f";
      for (let j = 0; j < 3; j++) {
        let index = mesh.indices[i + j] + 1;
        out += " " + index + "/" + index + "/" + index;
      }
      out += "\n";
    }
  }

  return out;
}