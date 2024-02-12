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
    this.classesSeen = [];
    
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
    
    this.classesSeen.push(element.name);
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
	otherEnd.name = otherEnd.reference.name.toLowerCase();
      }
      	
      var parameters = [otherEnd.reference.name];
      var fkField = "ForeignKeyField";
      
      if (!this.classesSeen.includes(otherEnd.reference.name)) {
	fkField = "DeferredForeignKeyField";
	parameters[0] = `"${otherEnd.reference.name}"`;
      }
      
      if (thisEnd.name)
	parameters.push(`backref = "${thisEnd.name}"`);
      
      if (otherEnd.cardinality.includes("0")) 
	parameters.push('null = True');

      
      this.codeWriter
	.writeln(`${otherEnd.name} = ${fkField}(${parameters.join(', ')})`);
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
      let end1 = relation.end1.name || relation.end1.reference.name;
      let end2 = relation.end2.name || relation.end2.reference.name;
      
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
      
      let otherName = other.name || other.reference.name.toLowerCase() + "s"; 
      codeWriter
	.writeln(`${end.reference.name.toLowerCase()} = ` +
		 `ForeignKeyField(${end.reference.name}, `+
		 `backref = "${otherName}")`);
    }

    codeWriter
      .dedent()
      .writeln()
      .writeln()
      .writeln();
  }    

}


//------------------------------------------------------------------------------
// Topological sort
//------------------------------------------------------------------------------


class AssociationGraph {
  
  // A graph representing one-to-one and one-to-many associations
  constructor(classes)
  {
    // A "child" class depends on its parents for definition

    // For a many-to-one relationship, the 'many-class' should include
    // the foreign key of the 'one-class'.  So in this case the
    // many-class is a child of the one. If this is not possible we
    // should use a deferred foreign key (which is a clunky workaround).

    // Another example is a one-to-zero-or-one relationship.  In this
    // case the key should naturally go with the one-class.  If this
    // is not possible, we should put it with the zero-or-one class,
    // but make that field nullable. This is preferrable breaking a
    // many-to-one relationship.

    // Roots of this tree then represent nodes which depend on nothing else...
    
    this.nodes = classes;
    this.children = {};
    this.oneToOne = {};
    
    // Fill in the graph initially
    this.populateEdges(this.nodes);
  }

  populateEdges(classes)
  {
    // Start with blank lists
    classes.forEach((cls) => this.children[cls.name] = []);
    classes.forEach((cls) => this.oneToOne[cls.name] = []);
    
    // Get all assocations
    let associations = app.repository.getInstancesOf("ERDRelationship");

    associations
      .filter((assoc) =>
	classes.includes(assoc.end1.reference) &&
	  classes.includes(assoc.end2.reference))
      .forEach((assoc) => {
	
	for (const [end1, end2] of [[assoc.end1, assoc.end2],
				    [assoc.end2, assoc.end1]]) {

	  // Many-to-one
	  if ( end1.cardinality.includes("*") &&
	       !end2.cardinality.includes("*"))
	    this.children[end2.reference.name].push(end1.reference);
	  
	  // One-to-zero-or-one
	  else if (end1.cardinality === "1" &&
		   end2.cardinality === "0..1") {
	    this.children[end2.reference.name].push(end1.reference);
	    this.oneToOne[end2.reference.name].push(end1.reference);
	  }
	}
	
      });
	     
  }

  
  findRoots(remainingClasses)
  {
    // Find nodes which are not children of any other
    return remainingClasses
      .filter((candidate) =>
	!remainingClasses.some((parent) =>
	  this.children[parent.name]
	    .includes(candidate)));
      
  }


  numberOfParents(classes)
  {
    var numParents = {};
    classes.forEach((cls) => numParents[cls.name] = 0);

    classes.forEach((cls) =>
      this.children[cls.name]
	.forEach((child) => numParents[child.name] += 1)
    );
    
    return numParents;
  }

  getAParent(classes, child)
  {
    return classes.find((cls) => this.children[cls.name].includes(child));
  }

  
  breakAssociation(remainingClasses)
  {
    // The graph of only remainingClasses contains a cycle.
    // Break one of the edges with the goal of removing cycles
    console.log("Breaking association!");

    // Remove all one-to-one edges first
    for (const cls of remainingClasses) {
      
      for (const child of this.children[cls.name]) {
	if (this.oneToOne[cls.name].includes(child)) {

	  // Remove the edge
	  this.children[cls.name] =
	    this.children[cls.name].filter((item) => item !== child);
	  this.oneToOne[cls.name] =
	    this.oneToOne[cls.name].filter((item) => item !== child);
	  
	  return;
	  
	}
      }
    }

    
    let numParents = this.numberOfParents(remainingClasses);

    // Sort the array so those closer to being a root come out first
    remainingClasses.sort((a, b) => numParents[a] - numParents[b]);

    // Remove first many-to-one edges next
    let cls = remainingClasses[0];
    let parent = this.getAParent(remainingClasses, cls);

    this.children[parent.name] =
      this.children[parent.name].filter((item) => item !== cls);
    this.oneToOne[parent.name] =
      this.oneToOne[parent.name].filter((item) => item !== cls);
  }

  
  topologicalSort(classes)
  {
    // Construct a tree in which children depend on parents
    let topologicalOrder = []
    let brokenAssociations = [];
    let remainingClasses = classes;
    
    while (remainingClasses.length > 0) {
      
      let roots = this.findRoots(remainingClasses);
      
      if (roots.length > 0) {
	
	topologicalOrder.push(... roots);
	remainingClasses =
	  remainingClasses.filter((cls) => !roots.includes(cls));
	
      } else {

	// Cycle found. Must break it...
	this.breakAssociation(remainingClasses);
	
      }
    }

    return topologicalOrder;
  }

  toString()
  {
    return this.classes.map((cls) =>
      this.children[cls.name]
	.map((child) => "${cls} -> ${child}")
	.join("\n"))
      .join("\n");
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

  let assocGraph = new AssociationGraph(classes);
  orderedClasses = assocGraph.topologicalSort(classes);
    
  var filename =  fullPath + '/model.py';
  var text = peeweeCodeGenerator.generate(orderedClasses, options);

  // Write the file
  fs.writeFileSync(filename, text);
}


exports.generate = generate;
