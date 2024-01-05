/*==============================================================================
 * PeeWee Code generator
 *============================================================================*/

const codeGenerator = require('./code-generator');


function getGenOptions ()
{
  return {
    dbFilename: app.preferences.get('peewee.dbFilename'),
    dbVariable: app.preferences.get('peewee.dbVariable'),
    useTab: app.preferences.get('peewee.useTab'),
    indentSpaces: app.preferences.get('peewee.indentSpaces')
  };
}


async function handleGenerate (base, path, options)
{  
  // If options is not passed, get from preference
  options = options || getGenOptions();
  

  // Try to find DataModel
  datamodels = app.repository.getInstancesOf("ERDDataModel");

  if (!datamodels) {
    app.toast.warning("No data models found");
    return;
  }
  
  if (datamodels.length == 1) {
    base = datamodels[0];
  } else {
    // If base is not assigned, popup ElementPicker
    let { buttonId, returnValue } = await app.elementPickerDialog.showDialog(
      'Select a base model to generate', null, type.ERDDataModel);
    
    if (buttonId === 'ok') {
      base = returnValue;
    } else {
      return;
    }
  }
  
  // If path is not assigned, popup Open Dialog to select a folder
  if (base && !path) {
    var files = app.dialogs.showOpenDialog(
      'Please select a folder into which to generate PeeWee code',
      null, null, { properties: [ 'openDirectory' ] });
    if (files && files.length > 0) {
      path = files[0];
    }
  }

  // Generate the code from the chosen base
  if (base && path) {
    console.log("Generating...");
    codeGenerator.generate(base, path, options);
  } else {
    app.toast.info("Please specify both an ERD Diagram and path");
  }
}


/**
 * Popup PreferenceDialog with Peewee Preference Schema
 */
function handleConfigure ()
{
  app.commands.execute('application:preferences', 'peewee');
}


function init ()
{
  app.commands.register('peewee:generate',  handleGenerate);
  app.commands.register('peewee:configure', handleConfigure);
}

exports.init = init;
