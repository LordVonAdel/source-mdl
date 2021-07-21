const StudioStruct = require("structron");

/**
 * Structures based on /src/public/optimize.h
 */

const BoneStateChangeHeader_t = new StudioStruct("BoneStateChangeHeader_t")
  .addMember(StudioStruct.TYPES.INT, "hardwareID")
  .addMember(StudioStruct.TYPES.INT, "newBoneID")

const Vertex_t = new StudioStruct()
  .addMember(StudioStruct.TYPES.BYTE, "boneWeightIndex0")
  .addMember(StudioStruct.TYPES.BYTE, "boneWeightIndex1")
  .addMember(StudioStruct.TYPES.BYTE, "boneWeightIndex2")
  .addMember(StudioStruct.TYPES.BYTE, "numBones")
  .addMember(StudioStruct.TYPES.USHORT, "origMeshVertID")
  .addMember(StudioStruct.TYPES.BYTE, "boneID0")
  .addMember(StudioStruct.TYPES.BYTE, "boneID1")
  .addMember(StudioStruct.TYPES.BYTE, "boneID2");

const StripHeader_t = new StudioStruct("StripHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numIndices")
  .addMember(StudioStruct.TYPES.INT, "indexOffset")
  .addMember(StudioStruct.TYPES.INT, "numVerts")
  .addMember(StudioStruct.TYPES.INT, "vertOffset")
  .addMember(StudioStruct.TYPES.SHORT, "numBones")
  .addMember(StudioStruct.TYPES.BYTE, "flags")
  .addMember(StudioStruct.TYPES.INT, "numBoneStateChanges")
  .addMember(StudioStruct.TYPES.INT, "boneStateChangeOffset")
  //.addArray(Vertex_t, "vertices", "vertOffset", "numVerts", true) // Crashes on some files
  //.addArray(BoneStateChangeHeader_t, "boneStateChange", "boneStateChangeOffset", "numBoneStateChanges", true);

const StripGroupHeader_t = new StudioStruct("StripGroupHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numVerts")
  .addMember(StudioStruct.TYPES.INT, "vertOffset")
  .addMember(StudioStruct.TYPES.INT, "numIndices")
  .addMember(StudioStruct.TYPES.INT, "indexOffset")
  .addMember(StudioStruct.TYPES.INT, "numStrips")
  .addMember(StudioStruct.TYPES.INT, "stripOffset")
  .addMember(StudioStruct.TYPES.BYTE, "flags")
  .addArray(Vertex_t, "vertices", "vertOffset", "numVerts", true)
  .addArray(StudioStruct.TYPES.USHORT, "indices", "indexOffset", "numIndices", true)
  .addArray(StripHeader_t, "strips", "stripOffset", "numStrips", true);

const MeshHeader_t = new StudioStruct("MeshHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numStripGroups")
  .addMember(StudioStruct.TYPES.INT, "stripGroupHeaderOffset")
  .addMember(StudioStruct.TYPES.BYTE, "flags")
  .addArray(StripGroupHeader_t, "stripGroups", "stripGroupHeaderOffset", "numStripGroups", true);

const ModelLODHeader_t = new StudioStruct("ModelLODHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numMeshes")
  .addMember(StudioStruct.TYPES.INT, "meshOffset")
  .addMember(StudioStruct.TYPES.FLOAT, "switchPoint")
  .addArray(MeshHeader_t, "meshes", "meshOffset", "numMeshes", true);

const ModelHeader_t = new StudioStruct("ModelHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numLODs")
  .addMember(StudioStruct.TYPES.INT, "lodOffset")
  .addArray(ModelLODHeader_t, "LODs", "lodOffset", "numLODs", true);

const BodyPartHeader_t = new StudioStruct("BodyPartHeader_t")
  .addMember(StudioStruct.TYPES.INT, "numModels")
  .addMember(StudioStruct.TYPES.INT, "modelOffset")
  .addArray(ModelHeader_t, "models", "modelOffset", "numModels", true);

const FileHeader_t = new StudioStruct("FileHeader_t")
  .addMember(StudioStruct.TYPES.INT, "version")
  .addMember(StudioStruct.TYPES.INT, "vertCacheSize")
  .addMember(StudioStruct.TYPES.USHORT, "maxBonesPerStrip")
  .addMember(StudioStruct.TYPES.USHORT, "maxBonesPerTri")
  .addMember(StudioStruct.TYPES.INT, "maxBonesPerVert")
  .addMember(StudioStruct.TYPES.INT, "checkSum")
  .addMember(StudioStruct.TYPES.INT, "numLODs")
  .addMember(StudioStruct.TYPES.INT, "materialReplacementListOffset")
  .addMember(StudioStruct.TYPES.INT, "numBodyParts")
  .addMember(StudioStruct.TYPES.INT, "bodyPartOffset")
  .addArray(BodyPartHeader_t, "bodyParts", "bodyPartOffset", "numBodyParts");

module.exports = {
  FileHeader_t
}