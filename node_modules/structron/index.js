const Report = require('./Report.js');

class Struct {

  /**
   * Creates a new struct definition
   * @param {=String} name Optional name. Only used for debugging purposes
   */
  constructor(name = "") {
    this.members = [];
    this.arrays = [];
    this.references = [];
    this.rules = [];
    this.name = name;
  }

  /**
   * Adds a member to load
   * @param {Type} type Datatype of the member to load
   * @param {String} name Name of the member
   * @returns {Struct}
   */
  addMember(type, name) {
    if (isNaN(type.SIZE)) throw new Error("Element with no fixed size is not allowed as struct member (" + name + ")!",);

    this.members.push({type, name});
    return this;
  }

  /**
   * Adds a an array to load from values inside this struct. The order is not important
   * @param {Type} type Datatype of the member to load
   * @param {String} name Name of the member
   * @param {any} offsetMemberName Number or Name of the member which stores the address of the array
   * @param {any} countMemberName Number or name of the member which stores the length of the array
   * @param {Boolean} relative Is the address in the target member relative to the structs address?
   * @returns {Struct}
   */
  addArray(type, name, offsetMemberName, countMemberName, relative = false) {
    this.arrays.push({
      name,
      offsetMemberName,
      countMemberName,
      type,
      relative
    });
    return this;
  }

  /**
   * Adds a reference. References will appear as own members in the out data.
   * @param {*} type Type of the reference
   * @param {String} name Name of the new data member
   * @param {String} membername Name of the address containg existing data member
   * @param {Boolean} relative Is the adress relative to the structs address?
   * @returns {Struct}
   */
  addReference(type, name, memberName, relative = false) {
    this.references.push({
      type,
      name,
      memberName,
      relative
    });
    return this;
  }

  /**
   * Adds a rule. Rules give extra validation options
   * @returns {Struct} itself
   */
  addRule(rule) {
    this.rules.push({
      rule
    });
    return this;
  }

  /**
   * Converts a buffer to an object with the structs structure
   * @param {Buffer} buffer Buffer to read from
   * @param {=Number} offset Offset byte to start reading from
   */
  read(buffer, offset = 0, report = null) {
    let data = {};
    let address = offset;
    for (let member of this.members) {
      data[member.name] = member.type.read(buffer, address, report);
      address += member.type.SIZE;
    }

    for (let array of this.arrays) {
      let arrayOffset = (typeof array.offsetMemberName == 'string') ? data[array.offsetMemberName] : array.offsetMemberName;
      let arrayCount = (typeof array.offsetMemberName == 'string') ? data[array.countMemberName] : array.countMemberName;

      if (array.relative) arrayOffset += offset;

      let arr = [];
      for (let i = 0; i < arrayCount; i++) {
        arr.push(
          array.type.read(buffer, arrayOffset + i * array.type.SIZE, report)
        );
      }

      // Does double mark some fields that are only read ones :/
      report.markAreaAsRead(arrayOffset, arrayCount * array.type.SIZE);

      data[array.name] = arr;

      if (report) {
        report.arrays.push({
          name: array.name,
          start: arrayOffset, 
          count: arrayCount, 
          length: arrayCount * array.type.SIZE
        });
      }
    }

    for (let reference of this.references) {
      let referenceOffset = data[reference.memberName];
      if (reference.relative) referenceOffset += offset;
      data[reference.name] = reference.type.read(buffer, referenceOffset, report);
    }

    for (let rule of this.rules) {
      let response = rule.rule(data, buffer);
      if (response) {
        report.errors.push(response);
      }
    }

    if (report) {
      report.markAreaAsRead(offset, this.SIZE)
    }

    return data;
  }

  /**
   * backward compatibility. Use .read instead! 
   */
  import() {
    this.read(...arguments);
  }

  /**
   * Returns an report object. It will contain the extracted data as well as some statistics like how many bytes were read and what errors occoured.
   * @param {*} buffer Buffer to read from
   * @param {*} offset Offset byte to start reading from
   * @returns {Report} The report
   */
  report(buffer, offset) {
    let report = new Report({
      monitorUsage: true
    }, buffer);
    report.data = this.read(buffer, offset, report);

    report.checkForArrayCollisions();

    return report;
  }

  /**
   * Validates a structure
   * @param {Buffer} buffer Buffer to read from
   * @param {Number} offset Byte offset in the buffer to begin reading from
   * @returns {Boolean} True when valid 
   */
  validate(buffer, offset = 0) {
    try {
      this.read(buffer, offset)
      return true;
    } catch (e) {
      return false;
    }
  }

  get SIZE() {
    return this.members.reduce((val, member) => val + member.type.SIZE, 0);
  }

  getOffsetByName(name) {
    let address = 0;
    for (let member of this.members) {
      if (member.name == name) return address;
      address += member.type.SIZE
    }
    return NaN;
  }

}

Struct.TYPES = require('./types.js');
Struct.RULES = require('./rules.js');

module.exports = Struct;
