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
    
    this.baseModel = baseModel;
    this.basePath = basePath;
    this.options = null;
    this.codeWriter = null;
    this.manyToMany = [];

    this.peeweeField = {
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

    
  }

  
  getIndentString (options) {
    if (options.useTab) {
      return '\t';
    } else {
      return ' '.repeat(options.indentSpaces);
    }
  }



  toPeeweeField(element) {
    var type = this.peeweeField[element.type];
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

  

  //----------------------------------------------------------------------------
    
  generate (classes, options) {
      
    var codeWriter = new codegen.CodeWriter(this.getIndentString(options));
    
    this.codeWriter = codeWriter;
    this.options = options;

    codeWriter.writeString(
`#===============================================================================
# PeeWee Database Model
#===============================================================================


from peewee import *

${options.dbVariable} = SqliteDatabase('${options.dbFilename}')


#-------------------------------------------------------------------------------


class BaseModel(Model):

   class Meta:
      database = ${options.dbVariable}


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
    codeWriter.dirty = false;
    
    element.columns
      .forEach((column) => this.writeColumn(column));

    app.repository.getRelationshipsOf(element)
      .forEach((relationship) => this.writeRelation(element, relationship));

    if (!codeWriter.dirty)
      codeWriter.writeln("pass");
    
    codeWriter
      .dedent()
      .writeln()
      .writeln()
      .writeln();
    
  }

  writeColumn(element) {
    this.codeWriter.writeln(`${element.name} = ${this.toPeeweeField(element)}`);
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

      // One-to-one. Possibly doubling. Only include this link once.
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

    // Many-to-one: will be generated as one-to-many.
    if (thisEnd.cardinality === '1' || thisEnd.cardinality === "0..1") {
      return;
    }

    // Many-to-many

    // This is a many-to-many relationship. We will have to introduce
    // an entirely new table for the purpose. Push it now, and specify later...
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
      .writeln(`""" Implements a many-to-many relationship between `+
	       `${relation.end1.reference.name} and `+
	       `${relation.end2.reference.name} """`);

    for (const [end, other] of [[relation.end1, relation.end2],
				[relation.end2, relation.end1]]) {
      
      var otherName = other.name || other.reference.name.toLowerCase() + "s"; 
      codeWriter
	.writeln(`${end.reference.name.toLowerCase()} = ` +
		 `ForeignField(${end.reference.name}, backref = ${otherName})`);
    }

    codeWriter
      .dedent()
      .writeln()
      .writeln()
      .writeln();
  }
    

}



//------------------------------------------------------------------------------
// Generate
//----------------------------------------------------------------------------

function ensureFolderExists(path)
{
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
    return;
  }
  
  app.toast.info("Using existing folder");
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


exports.generate = generate;
