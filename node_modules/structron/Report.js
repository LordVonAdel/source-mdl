/** 
 *  @class Report
 *  @type {Object}
 *  @property {Object} data The exported data.
 */

class Report {

  constructor(options, buffer) {
    this.buffer = buffer;
    
    this.monitorUsage = !!options.monitorUsage;

    if (this.monitorUsage) {
      this.usageBuffer = Buffer.alloc(buffer.length);
    }

    this.errors = [];
    this.arrays = [];
  }

  markAreaAsRead(start, length) {
    if (!this.monitorUsage) return;

    for (let i = start; i < start + length; i++) {
      if (this.usageBuffer[i] < 255) {
        this.usageBuffer[i]++;
      }
    }
  }

  checkForArrayCollisions() {
    for (let i = 0; i < this.arrays.length; i++) {
      let a1 = this.arrays[i];
      for (let j = i; j < this.arrays.length; j++) {
        let a2 = this.arrays[j];

        if (a1 == a2) continue;
        if (a1.start == a2.start) continue;

        if ((a1.start + a1.length) > a2.start) {
          this.errors.push("Array " + a1.name + " overlaps with " + a2.name);
        }
      }
    }
  }

  toString() {
    let out = "\n===Structron-Report==="
    + "\n Buffer size: " + this.buffer.length;

    if (this.monitorUsage) {
      let bytesRead = this.getUsage();
      out += "\n Bytes read: " + bytesRead + " (" + Math.floor((bytesRead / this.buffer.length) * 100) + "%)";
    }

    out += "\n Number of arrays: " + this.arrays.length;

    if (this.errors.length) {
      out += "\n Errors (" + this.errors.length + "):\n"
      + this.errors.join("\n  ");
    } else {
      out += "\n No errors were found."
    }
    
    return out;
  }

  getUsage() {
    let number = 0;
    for (let i = 0; i < this.usageBuffer.length; i++) {
      if (this.usageBuffer[i] > 0) number++;
    }
    return number;
  }

}

module.exports = Report;