/*
 * Python code formatter
 */

 
/**
 * CodeWriter
 */
class CodeWriter {
  /**
   * @constructor
   */
  constructor (indentString) {
    /** @member {Array.<string>} lines */
    this.lines = [];

    /** @member {int} indentLevel */
    this.indentLevel = 0;

    /** @member {string} indentString */
    this.indentString = indentString || '    '; // default 4 spaces

    this.dirty = false;
  }

  /**
   * Indent
   */
  indent () {
    this.indentLevel += 1;
    return this;
  }

  /**
   * Outdent
   */
  dedent () {
    this.indentLevel -= 1;
    console.assert(this.indentLevel >= 0, "Indent level went negative");
    return this;
  }

  /**
   * Write a line
   * @param {string} line
   */
  writeln (line) {
    if (line) {
      this.lines.push(this.indentString.repeat(this.indentLevel) + line);
      this.dirty = true;
    } else {
      this.lines.push('');
    }

    return this;
  }

  writeString(string) {
    string.split("\n")
      .map((line) => line.replace("   ", this.indentString))
      .forEach((line) => this.writeln(line));
    return this;
  }

  /**
   * Return as all string data
   * @return {string}
   */
  getData () {
    return this.lines.join('\n');
  }

}

exports.CodeWriter = CodeWriter;
