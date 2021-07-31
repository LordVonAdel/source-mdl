const Import = require("./import/Import.js");
const toGLTF = require("./export/toGLTF.js");
const toOBJ = require("./export/toOBJ.js");
const toXMODEL = require("./export/toXMODEL.js");

const FLAGS = {
  0: "STUDIOHDR_FLAGS_AUTOGENERATED_HITBOX",
  1: "STUDIOHDR_FLAGS_USES_ENV_CUBEMAP",
  2: "STUDIOHDR_FLAGS_FORCE_OPAQUE",
  3: "STUDIOHDR_FLAGS_TRANSLUCENT_TWOPASS",
  4: "STUDIOHDR_FLAGS_STATIC_PROP",
  5: "STUDIOHDR_FLAGS_USES_FB_TEXTURE",
  6: "STUDIOHDR_FLAGS_HASSHADOWLOD",
  7: "STUDIOHDR_FLAGS_USES_BUMPMAPPING",
  8: "STUDIOHDR_FLAGS_USE_SHADOWLOD_MATERIALS",
  9: "STUDIOHDR_FLAGS_OBSOLETE",
  10: "STUDIOHDR_FLAGS_UNUSED",
  11: "STUDIOHDR_FLAGS_NO_FORCED_FADE",
  12: "STUDIOHDR_FLAGS_FORCE_PHONEME_CROSSFADE",
  13: "STUDIOHDR_FLAGS_CONSTANT_DIRECTIONAL_LIGHT_DOT",
  14: "STUDIOHDR_FLAGS_FLEXES_CONVERTED",
  15: "STUDIOHDR_FLAGS_BUILT_IN_PREVIEW_MODE",
  16: "STUDIOHDR_FLAGS_AMBIENT_BOOST",
  17: "STUDIOHDR_FLAGS_DO_NOT_CAST_SHADOWS",
  18: "STUDIOHDR_FLAGS_CAST_TEXTURE_SHADOWS"
} 

class MDL {

  constructor() {
    this.name = "";
    this.hasGeometry = false;

    this.eyeposition = [0, 0, 0];
    this.illumposition = [0, 0, 0];
    this.hullMin = [-1, -1, -1];
    this.hullMax = [1, 1, 1];
    this.viewBBMin = [0, 0, 0];
    this.viewBBMax = [0, 0, 0];

    this.flags = 0;
    this.mass = 0;
    this.surfaceProp = "";

    this.keyvalues = [];

    this.bones = [];
    this.hitboxes = [];

    this.textures = [];
    this.textureDirs = [],

    // First layer: LOD, Second layer: Mesh
    this.meshes = [];

    // First Layer: LOD, Second layer: Vertice
    this.vertices = [];

    this.raw = {};
  }

  getMetadata() {
    return {
      name: this.name,
      mass: this.mass,
      flags: this.getFlagStrings(),
      surfaceProp: this.surfaceProp,
      LODs: this.vertices.length,
      verticeNumber: this.vertices[0].length,
      textures: this.textures,
      textureDirs: this.textureDirs
    }
  }

  _flipFlags(flags) {
    /**
     * @todo Test this
     */
    let flagsFlipped = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 8; j++) {
        flagsFlipped |= (flags & (i * 8 + (8 - j))) << (i * 8 + j);
      }
    }
    return flagsFlipped;
  }

  getFlagStrings() {
    let flagsFlipped = this._flipFlags(this.flags);

    let out = [];
    for (let i = 0; i < 19; i++) {
      let bit = (this.flags << i) & 1;
      if (bit) {
        out.push(FLAGS[i]);
      }
    }
    for (let i = 19; i < 32; i++) {
      let bit = (flagsFlipped << i) & 1;
      if (bit) {
        out.push("UNKOWN FLAG: " + i);
      }
    }
    return out;
  }

  import(datas) {
    new Import(datas, this);
  }

  toGLTF() {
    if (!this.hasGeometry) throw new Error("No Geometry data is present. This most likely because no VVD and VTX file was supplied to the importer");
    return toGLTF(this);
  }

  toObj() {
    if (!this.hasGeometry) throw new Error("No Geometry data is present. This most likely because no VVD and VTX file was supplied to the importer");
    return toOBJ(this);
  }
  
  toXMODEL() {
    if (!this.hasGeometry) throw new Error("No Geometry data is present. This most likely because no VVD and VTX file was supplied to the importer");
    return toXMODEL(this);
  }

  toData() {
    return this.raw;
  }

}

module.exports = MDL;
