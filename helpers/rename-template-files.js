/* global __dirname */

const path = require('path');
const fileAssistant = require('file-assistant');
const cliColor = require('cli-color');

const templatePath = path.resolve('./template');
const npmData = require(path.resolve('./package.json'));
const npmName = npmData.name;
const cliError = cliColor.red;
const structure = [
  {file:'.gitignore', move:path.resolve(templatePath,'git-ignore')},
  {file:'.npmignore', move:path.resolve(templatePath,'npm-ignore')},
  {file:'.npmrc', move:path.resolve(templatePath,'npm-rc')}
];

fileAssistant(templatePath,structure,(o)=>{
  if(o.error) console.error(cliError(`Some files could not be created. Reinstall ${npmName} package and try again.`));
});