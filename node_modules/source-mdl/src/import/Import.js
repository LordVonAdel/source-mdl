const studio = require('./studio.js');
const optimize = require('./optimize.js');

const OPTIMIZED_MODEL_FILE_VERSION = 7;

const STRIP_IS_TRILIST	= 0x01;
const STRIP_IS_TRISTRIP	= 0x02;

const STRIPGROUP_IS_FLEXED          = 0x01;
const STRIPGROUP_IS_HWSKINNED       = 0x02;
const STRIPGROUP_IS_DELTA_FLEXED    = 0x04;
const STRIPGROUP_SUPPRESS_HW_MORPH  = 0x08;

/**
 * MDL scheme: https://developer.valvesoftware.com/wiki/MDL
 * VTX scheme: https://developer.valvesoftware.com/wiki/VTX
 * VVD scheme: https://developer.valvesoftware.com/wiki/VVD
 * PHY scheme: https://developer.valvesoftware.com/wiki/PHY
 */

 /**
  * Importer class for Source Engine models
  */
class Import {

  constructor(data, mdl) {
    this.mdl = mdl;

    let id = data.mdlData.readInt32BE(0);
    if (id != 0x49445354) throw new Error("Unkown MDL id: " + id);

    this.importMDL = studio.studiohdr_t.report(data.mdlData);
    this.importVTX = optimize.FileHeader_t.report(data.vtxData);
    this.importVVD = studio.vertexFileHeader_t.report(data.vvdData);

    this.headerMDL = this.importMDL.data;
    this.headerVTX = this.importVTX.data;
    this.headerVVD = this.importVVD.data;

    if (this.headerMDL.checksum != this.headerVTX.checkSum) throw new Error("Checksums don't match! (MDL <-> VTX)");
    if (this.headerMDL.checksum != this.headerVVD.checksum) throw new Error("Checksums don't match! (MDL <-> VVD)");
    if (this.headerVTX.version != OPTIMIZED_MODEL_FILE_VERSION) throw new Error("Incompatible VTX version!");

    this.mdl.name = this.headerMDL.name;
    this.mdl.surfaceProp = this.headerMDL.surfaceProp;
    this.mdl.textureDirs = this.headerMDL.texturedirs.map(t => t.name);
    this.mdl.textures = this.headerMDL.textures.map(t => t.name);
    this.mdl.hullMin = this.headerMDL.hull_min;
    this.mdl.hullMax = this.headerMDL.hull_max;

    this.mdl.vertices = [];
    this.mdl.meshes = [];
    for (let i = 0; i < this.headerVVD.numLODs; i++) {
      this.mdl.vertices[i] = [];
      this.mdl.meshes[i] = [];
    }

    if (this.headerVVD.fixups.length == 0) {
      for (let i = 0; i < this.headerVVD.numLODVertexes0; i++) {
        let address = this.headerVVD.vertexDataStart + i * 48;
        let vtx = studio.mstudiovertex_t.read(data.vvdData, address);
        this.mdl.vertices[0].push({
          position: [vtx.m_vecPosition.x, vtx.m_vecPosition.y, vtx.m_vecPosition.z],
          normal: [vtx.m_vecNormal.x, vtx.m_vecNormal.y, vtx.m_vecNormal.z],
          texCoords: [vtx.m_vecTexCoord.x, vtx.m_vecTexCoord.y]
        });
      }
    } else {
      for (let fixup of this.headerVVD.fixups) {
        for (let i = 0; i < fixup.numVertexes; i++) {
          let address = this.headerVVD.vertexDataStart + (i + fixup.sourceVertexId) * 48;
          for (let j = fixup.lod; j >= 0; j--) {
            let vtx = studio.mstudiovertex_t.import(data.vvdData, address)
            this.mdl.vertices[j].push({
              position: [vtx.m_vecPosition.x, vtx.m_vecPosition.y, vtx.m_vecPosition.z],
              normal: [vtx.m_vecNormal.x, vtx.m_vecNormal.y, vtx.m_vecNormal.z],
              texCoords: [vtx.m_vecTexCoord.x, vtx.m_vecTexCoord.y]
            });
          }
        }
      }
    }


    for (let i = 0; i < this.headerMDL.bodyparts.length; i++) {
      let bodyPartsMDL = this.headerMDL.bodyparts[i];
      let bodyPartsVTX = this.headerVTX.bodyParts[i];
      for (let j = 0; j < bodyPartsMDL.models.length; j++) {
        let modelMDL = bodyPartsMDL.models[j];
        let movelVTX = bodyPartsVTX.models[j];
        for (let k = 0; k < modelMDL.meshes.length; k++) {
          let meshMDL = modelMDL.meshes[k];

          for (let lod_level = 0; lod_level < this.headerVVD.numLODs; lod_level++) { 
            let meshVTX = movelVTX.LODs[lod_level].meshes[k];

            let mesh = {
              indices: [],
              material: meshMDL.material
            };
            this.mdl.meshes[lod_level].push(mesh);

            for (let stripGroup of meshVTX.stripGroups) {

              for (let strip of stripGroup.strips) {
                if (strip.flags & STRIP_IS_TRILIST) {
                  for (let i = strip.numIndices - 1; i >= 0; i--) {
                    let vtxId = stripGroup.indices[i + strip.indexOffset];
                    let vtx = stripGroup.vertices[vtxId];
                    mesh.indices.push(vtx.origMeshVertID + meshMDL.vertexoffset);
                  }
                } else if (strip.flags & STRIP_IS_TRISTRIP) {
                  /**
                   * @todo Test it with a model that uses tristrips
                   */
                  for (let i = strip.numIndices + strip.indexOffset; i >= strip.indexOffset + 2; i--) {
                    mesh.indices.push(
                      stripGroup.vertices[stripGroup.indices[i]].origMeshVertID + meshMDL.vertexoffset,
                      stripGroup.vertices[stripGroup.indices[i - 2]].origMeshVertID + meshMDL.vertexoffset,
                      stripGroup.vertices[stripGroup.indices[i - 1]].origMeshVertID + meshMDL.vertexoffset
                    );
                  }
                }
              }
            }
          }
        }
      }
    }

  }

}

module.exports = Import;