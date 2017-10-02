#!/usr/bin/env node

const args = require('get-arguments');
const moduleName = require('./../package.json').name;
const commandsList = ['init','add','remove','list','get','set'];
const runCli = {
  init:require('./cli-init.js'),
  add:require('./cli-add.js'),
  remove:require('./cli-remove.js'),
  list:require('./cli-list.js'),
  get:require('./cli-get.js'),
  set:require('./cli-set.js')
};

args(moduleName,commandsList,(getArgs)=>{
  if(getArgs===null) return;
  runCli[getArgs.command](getArgs.args);
});