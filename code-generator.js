/*
 * PeeWee code generation
 */

const fs = require('fs');
const path = require('path');
const codegen = require('./codegen-utils');

/**
 *  Code Generator
 */
class PeeweeCodeGenerator {
  /**
   * @constructor
   *
   * @param {type.UMLPackage} baseModel
   * @param {string} basePath generated files and directories to be placed
   */
  constructor (baseModel, basePath) {
    /** @member {type.Model} */
    this.baseModel = baseModel;

    /** @member {string} */
    this.basePath = basePath;
  }

  /**
   * Return Indent String based on options
   * @param {Object} options
   * @return {string}
   */
  getIndentString (options) {
    if (options.useTab) {
      return '\t';
    } else {
      return ' '.repeat(options.indentSpaces);
    }
  }

  /**
   * Collect inheritances (super classes or interfaces) of a given element
   * @param {type.Model} elem
   * @return {Array.<type.Model>}
   */
  getInherits (elem) {
    var inherits = app.repository.getRelationshipsOf(elem, function (rel) {
      return (rel.source === elem && (rel instanceof type.UMLGeneralization || rel instanceof type.UMLInterfaceRealization));
    });

    return inherits.map(function (gen) { 
      //console.log(gen.target);
      return gen.target; 
    });
  }

  /**
   * Write Doc
   * @param {StringWriter} codeWriter
   * @param {string} text
   * @param {Object} options
   */
  writeDoc (codeWriter, text, options) {
    var i, len, lines;
    if (options.docString && text.trim().length > 0) {
      lines = text.trim().split('\n');
      if (lines.length > 1) {
        codeWriter.writeln('"""');
        for (i = 0, len = lines.length; i < len; i++) {
          codeWriter.writeln(lines[i]);
        }
        codeWriter.writeln('"""');
      } else {
        codeWriter.writeln('"""' + lines[0] + '"""');
      }
    }
  }

    /**
   * Write Meta
   * @param {StringWriter} codeWriter
   * @param {string} text
   * @param {Object} options
   */
  writeMeta (codeWriter, elem, options) {
    
    var is_blank=true;

    codeWriter.writeln('class Meta:');
    codeWriter.indent();
    if (elem.isAbstract){
      codeWriter.writeln('abstract = True');
      is_blank = false;      
    }

    var tags = elem.tags;
    var tag;

    for (var i = 0, len = tags.length; i < len; i++) {

      is_blank = false; 
      tag = tags[i];

      if (tag.kind == "string"){
        codeWriter.writeln(tag.name + "='" + tag.value.trim().split('\n') + "'");

      } else if (tag.kind == "number"){
        codeWriter.writeln(tag.name + "=" + tag.number);

      } else if (tag.kind == "boolean"){
        if (tag.checked){
          codeWriter.writeln(tag.name + "=True");        
        } else {
          codeWriter.writeln(tag.name + "=False");
        }
      }
    }
  
    if (is_blank){
      codeWriter.writeln('pass');
    }
    codeWriter.dedent();
    codeWriter.writeln();
  }

  /**
   * Write Variable
   * @param {StringWriter} codeWriter
   * @param {type.Model} elem
   * @param {Object} options
   */
  writeVariable (codeWriter, elem, options, isClassVar) {
    if (elem.name.length > 0) {
      var line;

      if (isClassVar) {
        line = elem.name;
      
      } else {
        line = 'self.' + elem.name;
      }

      if (elem.multiplicity && ['0..*', '1..*', '*'].includes(elem.multiplicity.trim())) {
        line += ' = []';
      
      } else if (elem.defaultValue && elem.defaultValue.length > 0) {
        line += ' = ' + elem.defaultValue;
      
      } else {
        line += ' = None';
      }
      codeWriter.writeln(line);
    }
  }

  /**
   * Write Attribute
   * @param {StringWriter} codeWriter
   * @param {type.Model} elem
   * @param {Object} options
   */
  writeAttribute (codeWriter, elem, options, isClassVar) {
    if (elem.name.length > 0) {
      
      var line;
      line = elem.name;
      
      if (elem.multiplicity && ['0..*', '1..*', '*'].includes(elem.multiplicity.trim())) {
        line += ' = []';

      } else if (elem.defaultValue && elem.defaultValue.length > 0) {
        line += ' = ' + elem.defaultValue;

      } else if (elem.type){
        line += ' = ' + mapBasicTypesToPeeweeFieldClass(elem);
        
      } else {
        line += ' = None';
      }
      codeWriter.writeln(line);
    }
  }


  /**
   * Write Constructor
   * @param {StringWriter} codeWriter
   * @param {type.Model} elem
   * @param {Object} options
   */
  writeConstructor (codeWriter, elem, options) {
    var self = this;
    var hasBody = false;
    codeWriter.writeln('def __init__(self):');
    codeWriter.indent();

    // from attributes
    if (elem.attributes.length > 0) {
      elem.attributes.forEach(function (attr) {
        if (attr.isStatic === false) {
          self.writeVariable(codeWriter, attr, options, false);
          hasBody = true;
        }
      });
    }

    // from associations
    var associations = app.repository.getRelationshipsOf(elem, function (rel) {
      return (rel instanceof type.UMLAssociation);
    });
    for (var i = 0, len = associations.length; i < len; i++) {
      var asso = associations[i];
      if (asso.end1.reference === elem && asso.end2.navigable === true) {
        self.writeVariable(codeWriter, asso.end2, options);
        hasBody = true;
      }
      if (asso.end2.reference === elem && asso.end1.navigable === true) {
        self.writeVariable(codeWriter, asso.end1, options);
        hasBody = true;
      }
    }

    if (!hasBody) {
      codeWriter.writeln('pass');
    }

    codeWriter.dedent();
    codeWriter.writeln();
  }

  /**
   * Write Method
   * @param {StringWriter} codeWriter
   * @param {type.Model} elem
   * @param {Object} options
   */
  writeMethod (codeWriter, elem, options) {
    if (elem.name.length > 0) {

      
      // name
      var line = 'def ' + elem.name;

      // params
      var params = elem.getNonReturnParameters();
      var paramStr = params.map(function (p) { 
        return p.name;
      }).join(', ');

      

      if (elem.isStatic) {
        codeWriter.writeln('@classmethod');
        codeWriter.writeln(line + '(cls, ' + paramStr + '):');
      } else {
        if (elem.isQuery){
          codeWriter.writeln('@property');
        }
        codeWriter.writeln(line + '(self, ' + paramStr + '):');
      }
      codeWriter.indent();
      this.writeDoc(codeWriter, elem.documentation, options);
      codeWriter.writeln('pass');
      codeWriter.dedent();
      codeWriter.writeln();
    }
  }

  /**
   * Write writeRealation
   * @param {StringWriter} codeWriter
   * @param {type.Model} elem
   * @param {type.Model} asso
   * @param {Object} options
   */
  writeRealation (codeWriter, elem, asso, options) {

    var tags = asso.tags;
    var tags_str = "";

    // console.log(tags);
    tags_str += getTagsString(tags);

    if (tags_str){
      tags_str = ", " + tags_str;
    }

    if (asso.end1.reference === elem && asso.end2.navigable === true && asso.end2.multiplicity && asso.end1.multiplicity) {       
        if (asso.end1.multiplicity == "1" && asso.end2.multiplicity == "1"){
          var refObjName = asso.end2.reference.name;
          var var_name = asso.name;
          codeWriter.writeln(var_name + " = models.OneToOneField('" + refObjName + "'"+ tags_str +")");
        }

        if (['0..*', '1..*', '*'].includes(asso.end1.multiplicity.trim()) && asso.end2.multiplicity == "1"){
          var refObjName = asso.end2.reference.name;
          var var_name = asso.name;
          codeWriter.writeln(var_name + " = models.ForeignKey('" + asso.end2.reference.name + "'" + tags_str +", on_delete=models.PROTECT)");
        }

        if (['0..*', '1..*', '*'].includes(asso.end1.multiplicity.trim()) && ['0..*', '1..*', '*'].includes(asso.end2.multiplicity.trim())){
          var refObjName = asso.end2.reference.name;
          var var_name = asso.name;
          codeWriter.writeln(var_name + " = models.ManyToManyField('" + asso.end2.reference.name + "'"+ tags_str +")");
        }
    }
  }


  /**
   * Write Enum
   * @param {StringWriter} codeWriter
   * @param {type.Model} elem
   * @param {Object} options
   */
  writeEnum (codeWriter, elem, options) {
    var line = '';

    codeWriter.writeln('from enum import Enum');
    codeWriter.writeln();

    // Enum
    line = 'class ' + elem.name + '(Enum):';
    codeWriter.writeln(line);
    codeWriter.indent();

    // Docstring
    this.writeDoc(codeWriter, elem.documentation, options);

    if (elem.literals.length === 0) {
      codeWriter.writeln('pass');
    } else {
      for (var i = 0, len = elem.literals.length; i < len; i++) {
        codeWriter.writeln(elem.literals[i].name + ' = ' + (i + 1));
      }
    }
    codeWriter.dedent();
    codeWriter.writeln();
  }


  
  
  /**
   * Generate code from a given element
   * @param {type.Model} elem
   * @param {string} path
   * @param {Object} options
   */
  generate (classes, basePath, options) {
      
    var fullPath = basePath + '/model.py';
    var codeWriter = new codegen.CodeWriter(this.getIndentString(options));

    codeWriter.writeString(
`#===============================================================================
# PeeWee Database Model
#===============================================================================


from peewee import *

db = SqliteDatabase('database.db')


#-------------------------------------------------------------------------------


class BaseModel(Model):

   class Meta:
      database = db


#-------------------------------------------------------------------------------


`);

    // Generate each class
    classes.forEach((element) => this.writeClass(codeWriter, element, options));

    // Write the file
    fs.writeFileSync(fullPath, codeWriter.getData());
  }




  /**
   * Write Class
   * @param {StringWriter} codeWriter
   * @param {type.Model} elem
   * @param {Object} options
   */
  writeClass (codeWriter, element, options) {

    codeWriter.writeln(`class ${element.name}(BaseModel):`);
    codeWriter.indent();
    if (element.documentation) {
      codeWriter.writeln(`"""${element.documentation}"""`);
    }
    codeWriter.writeln();
    
    element.columns
      .forEach((column) => this.writeColumn(codeWriter, column, options));
    
    codeWriter.dedent();
    codeWriter.writeln();
    codeWriter.writeln();
    codeWriter.writeln();
    
  }



  writeColumn(codeWriter, element, options) {

    codeWriter.writeln(`${element.name} = ${toPeeweeField(element)}`);
    
  }

  
  
}





function getTagsString(tags) {
  return tags.map(function (e) {
    if (e.kind == "string") {
      return e.name + "='" + e.value.trim().split('\n') + "'";
    } else if (e.kind == "number") {
      return e.name + "=" + e.number;
    } else if (e.kind == "boolean") {
      return e.name + (e.checked ? "=True" : "=False");
    } else if (e.kind == "reference") {
      return e.name + "=" + e.reference.name;
    }
  }).join(', ')
}


var peeweeField = {
    "VARCHAR": "CharField",
    "BOOLEAN": "BooleanField",
    "INTEGER": "IntegerField",
    "CHAR": "FixedCharField",
    // "BINARY": "",
    // "VARBINARY": "",
    "BLOB": "BlobField",
    "TEXT": "TextField",
    "SMALLINT": "SmallIntegerField",
    "BIGINT": "BigIntegerField",
    "DECIMAL": "DecimalField",
    "NUMERIC": "DecimalField",
    "FLOAT": "FloatField",
    "DOUBLE": "DoubleField",
    "BIT": "BitField",
    "DATE": "DateField",
    "TIME": "TimeField",
    "DATETIME": "DateTimeField",
    "TIMESTAMP": "TimestampField"
};


function toPeeweeField(element) {
  var type = peeweeField[element.type];
  var parameters = [];
  
  if (element.nullable)
    parameters.push('null = True');

  if (element.unique)
    parameters.push('unique = True');

  if (element.primaryKey)
    parameters.push('primary_key = True');

  if (element.length != 0)
    parameters.push(`max_length = ${element.length}`)
  
  return `${type}(${parameters.join(',')})`;
}



function generate (baseModel, basePath, options)
{
  var peeweeCodeGenerator = new PeeweeCodeGenerator(baseModel, basePath);
  var fullPath = basePath + '/' + baseModel.name.toLowerCase();

  ensureFolderExists(fullPath);
  
  var classes =
      baseModel.ownedElements
      .filter((element) => element instanceof type.ERDEntity);
  
  peeweeCodeGenerator.generate(classes, fullPath, options);
}

function ensureFolderExists(path)
{
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
    return;
  }
  
  if (app.dialogs
      .showConfirmDialog("A folder exists with the same name, overwrite?") === 'ok')
  {
    app.toast.info("Overwriting previous folder");
    deleteFolderRecursive(path);
    fs.mkdirSync(path);
  } else {
    app.toast.info("Using existing folder");
  }  
}

function deleteFolderRecursive(path)
{
  // Recursively remove subfolders
  fs.readdirSync(path)
    .map((file, index) => path + "/" + file)
    .forEach(function(filename) {
      if (fs.lstatSync(filename).isDirectory()) {
	deleteFolderRecursive(filename); // recurse
      } else {
	fs.unlinkSync(filename); // delete file
      }
    });

  // Remove this path
  fs.rmdirSync(path);
}

exports.generate = generate;
