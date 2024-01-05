/*==============================================================================
 * PeeWee code generation
 *============================================================================*/


const fs = require('fs');
const path = require('path');
const codegen = require('./codegen-utils');


/*-----------------------------------------------------------------------------
 *  Code Generator
 *---------------------------------------------------------------------------*/

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

    this.options = null;
    this.codeWriter = null;
    this.manyToMany = [];
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



  //****************************************************************************
  
  
  generate (classes, options) {
      
    var codeWriter = new codegen.CodeWriter(this.getIndentString(options));
    
    this.codeWriter = codeWriter;
    this.options = options;

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
    classes
      .forEach((element) => this.writeClass(element));

    this.manyToMany
      .forEach((relation) => this.writeManyToMany(relation));

    return codeWriter.getData();
  }



  writeClass(element) {
    var codeWriter = this.codeWriter;
    
    codeWriter.writeln(`class ${element.name}(BaseModel):`)
    codeWriter.indent();
    
    if (element.documentation) {
      codeWriter.writeln(`"""${element.documentation}"""`);
    }
    codeWriter.writeln();
    
    element.columns
      .forEach((column) => this.writeColumn(column));

    app.repository.getRelationshipsOf(element)
      .forEach((relationship) => this.writeRelation(element, relationship));
    
    codeWriter
      .dedent()
      .writeln()
      .writeln()
      .writeln();
    
  }

  writeColumn(element) {
    this.codeWriter.writeln(`${element.name} = ${toPeeweeField(element)}`);
  }

  writeRelation(element, relation) {
    console.log(element.name);
    console.log(relation);
    
    // Normalise the ends
    var thisEnd, otherEnd;
    if (relation.end1.reference === element) {
      thisEnd = relation.end1;
      otherEnd = relation.end2;
    } else {
      thisEnd = relation.end2;
      otherEnd = relation.end1;
    }

    // One-to-one and one-to-many
    if (otherEnd.cardinality === "1" || otherEnd.cardinality === "0..1") {

      // Possibly doubling. Only include this link once.
      if (thisEnd.cardinality === '1' || thisEnd.cardinality === "0..1") {
	if (thisEnd.name && !otherEnd.name)
	  return;

	if (otherEnd.cardinality === "0..1" && thisEnd.cardinality === "1")
	  return;

	if (thisEnd.name > otherEnd.name)
	  return;
      }

      if (!otherEnd.name) {
	otherEnd.name = otherEnd.type.name.toLowerCase();
      }
      	
      var parameters = [otherEnd.reference.name]
      if (thisEnd.name)
	parameters.push(`backref = ${thisEnd.name}`);
      
      if (otherEnd.cardinality.includes("0")) 
	parameters.push('null = True');
      
      this.codeWriter
	.writeln(`${otherEnd.name} = ForeignKeyField(${parameters.join(', ')})`);
      return;
    }

    // Many-to-many

    // This is a many-to-many relationship. We will have to introduce
    // an entirely new table for the purpose. Push it now, and specify it later...
    if (!this.manyToMany.includes(relation)) {
      this.manyToMany.push(relation);
    } 
  }


  writeManyToMany(relation)
  {
    var codeWriter = this.codeWriter;

    var tableName = relation.name;
    if (!tableName) {
      var end1 = relation.end1.name || relation.end1.type.name;
      var end2 = relation.end2.name || relation.end2.type.name;
      
      tableName = `${end1}_${end2}`;
    }
      
    codeWriter
      .writeln(`class ${tableName}(BaseModel):`)
      .indent()
      .writeln(`""" Implements a many-to-many relationship between ${relation.end1.type.name} and ${relation.end2.type.name} """`)
      .writeln();

    for (end, other) in [(relation.end1, relation.end2), (relation.end2, relation.end1)] {
      var otherName = other.name || other.type.name.toLowerCase() + "s"; 
      codeWriter
	.writeln(`${end.type.toLowerCase()} = ForeignField(${end.type}, backref = ${otherName})`);
    }

    codeWriter
      .writeln();
      .writeln();
      .writeln();
  }
    

}


//------------------------------------------------------------------------------


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
  
  return `${type}(${parameters.join(', ')})`;
}



function generate (baseModel, basePath, options)
{
  var peeweeCodeGenerator = new PeeweeCodeGenerator(baseModel, basePath);
  var fullPath = basePath + '/' + baseModel.name.toLowerCase();
  
  ensureFolderExists(fullPath);
  
  var classes =
      baseModel.ownedElements
      .filter((element) => element instanceof type.ERDEntity);

  var filename =  fullPath + '/model.py';
  var text = peeweeCodeGenerator.generate(classes, options);

  // Write the file
  fs.writeFileSync(filename, text);
}


function ensureFolderExists(path)
{
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
    return;
  }
  
  app.toast.info("Using existing folder");
}

exports.generate = generate;
