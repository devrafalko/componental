/* global __dirname */

const path = require('path');
const modulePath = path.resolve(__dirname,'./..');

const fs = require('fs');
const moveOn = require('move-on');
const type = require('of-type');
const inquirer = require('inquirer');

const npmData = require(path.resolve(modulePath,'package.json'));
const npmBinCommand = Object.keys(npmData.bin)[0];
const npmName = npmData.name;

const cliColor = require('cli-color');
const cliError = cliColor.red;
const cliWarning = cliColor.yellow;
const cliPath = cliColor.green;
const cliKey = cliColor.cyanBright;



module.exports = new Init().run;

function Init(){
  this.run = (cliArguments)=>{
    const userContext = {
      handlers:this.handlers,
      utils:this.utils,
      data:{
        cliArguments: cliArguments
      },
      paths:{
        currentPath: process.cwd(),
        modulePath: modulePath,
        criticalPaths:[
          {path:'helpers', type:'dir'},
          {path:'helpers/components.json', type:'file'},
          {path:'package.json', type:'file'}
        ]
      }
    };

    const functionQueue = [
      this.defineArguments,
      this.definePaths,
      this.findCriticalFiles
    ];

    moveOn(functionQueue,userContext,onDone,onCatch);

    function onDone(context,reject){

    }

    function onCatch(context,err){
      const msg = err || cliError(`The initiation process was aborted.`);
      return console.error(msg);
    }

  };
}


Init.prototype.defineArguments = function(resolve,reject){
  const args = this.data.cliArguments;
  const argsArray = type(args,Array);
  if(argsArray&&!args.length) takeQuestionnaire.call(this);
  if(argsArray&&args.length) reject(cliError(`Invalid arguments.`)+`\nUse ${cliKey(npmBinCommand+' add')} to fill in the form or ${cliKey(npmBinCommand+' add')} with the following arguments:\n${cliKey('--path')} <path>\n${cliKey('--name')} <name>\n${cliKey('--entry')} true|false\n${cliKey('--pattern')} m|v|c|t|d`);
  if(type(args,Object)) parseArguments.call(this);
  
  function takeQuestionnaire(){
        const componentDataQueries = [
          {
            name:'path',
            type:'input',
            message:'Project path:',
            'default':this.handlers.setDefaultProjectPath.bind(this),
            filter:this.handlers.filterProjectPath.bind(this)
          },
          {
            name:'name',
            type:'input',
            message:'Component name:',
            'default':this.handlers.generateComponentName(),
            validate:this.handlers.validateComponentName.bind(this)
          },
          {
            name:'entry',
            type:'confirm',
            message:'Do you want your component to be the HTML entry point of your project?',
            'default':false
          },
          {
            name:'pattern.model',
            type:'confirm',
            message:'Do you want to add [MVC] model templates to your component?',
            'default':true
          },
          {
            name:'pattern.view',
            type:'confirm',
            message:'Do you want to add [MVC] view templates to your component?',
            'default':true
          },
          {
            name:'pattern.controller',
            type:'confirm',
            message:'Do you want to add [MVC] controller templates to your component?',
            'default':true
          },
          {
            name:'pattern.tests',
            type:'confirm',
            message:'Do you want to add unit test templates to your component?',
            'default':true
          },
          {
            name:'pattern.dom',
            type:'confirm',
            message:'Do you want to add DOM unit test templates to your component?',
            'default':true
          }
        ];

        inquirer.prompt(componentDataQueries).then((data)=>{
          this.data.cliArguments = data;
          return resolve();
        });
  }

  function parseArguments(){
    const argObject = {
      path:null,
      name:null,
      entry:null,
      pattern:{
        model:null,
        view:null,
        controller:null,
        tests:null,
        dom:null
      }
    };
  }
  
  
};

Init.prototype.definePaths = function(resolve,reject){
  
};

Init.prototype.findCriticalFiles = function(resolve,reject){
  
};

Init.prototype.synthComponents = function(resolve,reject){
  
};




Init.prototype.handlers = {
  filterProjectPath:function(userPath){
    return new Promise((resolve,reject)=>{
      const resolved = path.resolve(this.paths.currentPath,userPath);
      this.handlers.findProjectPath.call(this,resolved,this.paths.criticalPaths,(getPath)=>{
        this.paths.projectPath = getPath;
        return resolve(getPath);
      },reject);
    });
  },
  setDefaultProjectPath:function(){
    return new Promise((resolve)=>{
      this.handlers.findProjectPath.call(this,this.paths.currentPath,this.paths.criticalPaths,resolve,resolve.bind(this,null));
      
//      function onResolve(getPath){
//        resolve(getPath);
//      }
//      
//      function onReject(){
//        resolve(null);
//      }
      
    });
      
    
    
  },
  findProjectPath:function(dirPath,seekingList,resolve,reject){
    var currentPath = dirPath;
    var prevPath = currentPath;
    innerRun.call(this);
    
    function innerRun(){
      var successIter = 0;
      var elemIter = 0;
      for(let elem of seekingList){
        const resolved = path.join(currentPath,elem.path);
        this.utils.itemExists(resolved,(o)=>{
          if(elem.type==='file'&&o.file) successIter++;
          if(elem.type==='dir'&&o.dir) successIter++;
          elemIter++;
          return finish.call(this);
        });
      }

      function finish(){
        if(elemIter===seekingList.length&&successIter===seekingList.length) return resolve(currentPath);
        if(elemIter===seekingList.length&&successIter<seekingList.length) return next.call(this);
      }
      function next(){
        prevPath = currentPath;
        currentPath = path.dirname(currentPath);
        if(currentPath!==prevPath) return innerRun.call(this);
        if(currentPath===prevPath) return reject(`Could not recognize the ${npmName} project at the given path.`);
      }
    }
  },
  generateComponentName:function(){
    
  },
  validateComponentName:function(){
    
  }
};
Init.prototype.utils = {
  itemExists:function(getPath,callback){
    fs.stat(getPath,(err,stats)=>{
      var o = {error:null,exists:false,file:false,dir:false};
      if(err) o.error = err;
      if(!err){
        o.exists = type(err,null);
        o.file = type(stats,'Stats')&&stats.isFile();
        o.dir = type(stats,'Stats')&&stats.isDirectory();
      }
      return callback(o);
    });
  }
};
