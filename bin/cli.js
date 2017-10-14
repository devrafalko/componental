#!/usr/bin/env node

/* global __dirname */
const path = require('path');
const args = require('get-arguments');
const modulePath = path.resolve(__dirname,'./..');
const npmData = require(path.resolve(modulePath,'package.json'));
const npmBinCommand = Object.keys(npmData.bin)[0];

const commandsList = ['init','add','remove','list','get','set'];
const runCli = {
  init:require('./cli-init.js'),
  add:require('./cli-add.js'),
  remove:require('./cli-remove.js'),
  list:require('./cli-list.js'),
  get:require('./cli-get.js'),
  set:require('./cli-set.js')
};

args(npmBinCommand,commandsList,(getArgs)=>{
  if(getArgs===null) return;
  runCli[getArgs.command](getArgs.args);
});