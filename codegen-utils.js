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
  }

  /**
   * Indent
   */
  indent () {
    this.indentLevel += 1;
  }

  /**
   * Outdent
   */
  dedent () {
    this.indentLevel -= 1;
    console.assert(this.indentLevel >= 0, "Indent level went negative");
  }

  /**
   * Write a line
   * @param {string} line
   */
  writeln (line) {
    if (line) {
      this.lines.push(this.indentString.repeat(this.indentLevel) + line);
    } else {
      this.lines.push('');
    }
  }

  writeString(string) {
    string.split("\n")
      .map((line) => line.replace("   ", this.indentString))
      .forEach((line) => this.writeln(line));
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
