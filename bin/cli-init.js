/* global __dirname */

const path = require('path');
const root = path.resolve(__dirname,'./..');

const fs = require('fs');
const fileAssistant = require('file-assistant');
const moveOn = require('move-on');
const type = require('of-type');
const cliColor = require('cli-color');
const inquirer = require('inquirer');
const semver = require('semver');
const license = require('spdx-correct');

const npmData = require(path.resolve(root,'package.json'));
const npmBinCommand = Object.keys(npmData.bin)[0];
const npmName = npmData.name;

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
        rootPath:root,
        templatePath:path.resolve(root,'template'),
        cliArguments: cliArguments,
        currentPath: process.cwd()
      }
    };
    
    const functionQueue = [
      this.determineInstallPath,
      this.defineAdditionalDependencies,
      this.preventModulesPath,
      this.getFormData,
      this.setDependenciesInstall,
      this.ensureDir,
      this.preventOverwritePath,
      this.mergeTemplateFiles
    ];

    moveOn(functionQueue,userContext,onDone,onCatch);

    function onDone(context,reject){
      console.log(cliPath(`\nThe new ${npmName} project was successfully created.`));
    }

    function onCatch(context,err){
      const msg = err || cliError(`The initiation process was aborted.`);
      return console.error(msg);
    }
    
  };
}


Init.prototype.defineAdditionalDependencies = function(resolve,reject){
/* this function contains and creates the list of all dependencies that the user
 * can choose whether he/she wants to install during creating new project
 */
  const dependencies = {
    local:[
      {
        name:'jquery',
        package:'jquery',
        version:'^3.2.1',
        description:'jquery',
        install:false
      },
      {
        name:'jqueryUI',
        package:'webpack-jquery-ui',
        version:'^1.0.0',
        description:'jquery UI',
        install:false
      },
      {
        name:'bootstrap',
        package:'webpack-bootstrap-installer',
        version:'^1.0.0',
        description:'Bootstrap 3',
        install:false
      }
    ],
    global:[
      {
        name:'icons',
        package:'webpack-icons-installer',
        version:'^1.0.0',
        description:'Bootstrap Glyphicons, Google material-design-icons and font-awesome icons',
        install:false
      }
    ]
  };
  
  this.data.dependencies = dependencies;
  resolve();
};


Init.prototype.determineInstallPath = function(resolve,reject){
/* it takes the CLI arguments and tries to determine the path
 * where the new project template should be installed
 */
  const cliArgs = this.data.cliArguments;
  var determinePath;
  if(type(cliArgs,Array)){
    if(cliArgs.length) determinePath = path.resolve(cliArgs[0]);
    if(!cliArgs.length) determinePath = this.data.currentPath;
  }
  
  if(type(cliArgs,Object)){
    const getValue = cliArgs["-p"] || cliArgs["--path"];
    if(type(getValue,String)){
      determinePath = path.resolve(getValue);
    } else {
      return reject(cliError(`Invalid arguments. Use:\n  ${npmBinCommand} init\n  ${npmBinCommand} init <path>\n  ${npmBinCommand} init -p <path>\n  ${npmBinCommand} init --path <path>`));
    }
  }
  this.data.installPath = determinePath;
  resolve();
};


Init.prototype.preventModulesPath = function(resolve,reject){
/* it checks whether the installation path contains 'node_modules' 
 * and - if so - warns the user
 */
  var inModulesPath = this.data.installPath.split(path.sep).some((a)=>a==="node_modules");
  if(!inModulesPath) return resolve();
  inquirer.prompt({
    type:'confirm',
    'default':false,
    name:'confirm',
    message:cliWarning(`You attempt to init the new project in the "node_modules" directory. Do you want to continue?`)
  }).then((answer)=>{
    if(!answer.confirm) return reject();
    resolve();
  });
};


Init.prototype.getFormData = function(resolve){
/* Run the form to get the user data for creating package.json and other files dependent on it
 */
  var queries = [
    {
      name:'package.name',
      type:'input',
      message:'Project name:',validate:validateProjectName
    },
    {
      name:'package.version',
      type:'input',
      message:'Project version:',
      'default':'1.0.0',
      validate:(a)=> type(semver.valid(a),String) ? true:"Invalid version."
    },
    {
      name:'package.license',
      type:'input',
      message:'License:',
      'default':'MIT',
      validate:(a)=> type(license(a),String) ? true:`The license should be a valid SPDX license expression. Visit ${cliKey('https://spdx.org/licenses')}`
    },
    {
      name:'package.author',
      type:'input',
      message:'Author:'
    },
    {
      name:'package.description',
      type:'input',
      message:'Description:'
    },
    {
      name:'package.keywords',
      type:'input',
      message:'Keywords:',
      filter:(a)=> a.split(' ').filter((b)=>b.length)
    },
    {
      name:'html.title',
      type:'input',
      message:'HTML Title:'
    },
    {
      name:'components.entry',
      type:'input',
      message:'Entry-component name:',
      'default':'index',
      validate:validateComponentName
    },
    {
      name:'tests.browsers',
      type:'checkbox',
      message:`Check the browser(s) for tests:\n`,
      'default':['Chrome'],
      pageSize:8,
      choices:['Chrome','Firefox','Edge','Opera','PhantomJS','ChromeCanary','IE','Safari'],
      validate:(a)=> a.length ? true:'At least one browser must be chosen.'
    }
  ];


  addDependenciesQueries.call(this,queries);

  console.log("Fill out the form with the data essential to generate some files.");
  inquirer.prompt(queries).then((formData)=>{
    this.formData = formData;
    return resolve();
  });

  function addDependenciesQueries(queriesObject){
    const allDeps = this.data.dependencies.local.concat(this.data.dependencies.global);
    for(var dep of allDeps){
      queriesObject.push({
        name:`dependencies.${dep.name}`,
        type:'confirm',
        'default':true,
        message:`Do you want to install ${dep.description}?`
      });
    }
  }

  function validateProjectName(value){
    const rules = [
      {
        name:"length",
        test:/^.{1,214}$/.test(value),
        msg:"\nThe name must contain at least 1 and at most 214 characters."
      },
      {
        name:"upperCase",
        test:!(/[A-Z]/.test(value)),
        msg:"\nThe name cannot contain capital letters."
      },
      {
        name:"chars",
        test:/^[a-z0-9_.-]+$/.test(value),
        msg:"\nThe name must contain only url-safe characters [a-z0-9_-.]."
      },
      {
        name:"startWith",
        test:!(/^[._]/.test(value)),
        msg:"\nThe name cannot begin with period or underscore."
      }
    ];
    var msg = "";
    for(var i in rules) if(!rules[i].test) msg += rules[i].msg;
    return msg.length ? msg:true;
  }
  
  function validateComponentName(value){
    const rules = [
      {
        name:"length",
        test:/^.{1,214}$/.test(value),
        msg:"\nThe name must contain at least 1 and at most 214 characters."
      },
      {
        name:"chars",
        test:/^[A-Za-z0-9$@_.-]+$/.test(value),
        msg:`\nThe name must contain only letters, numbers and the following chars: ${cliKey('_.-$@')}`
      },
      {
        name:"startWith",
        test:!(/^\./.test(value)),
        msg:"\nThe name cannot begin with a period."
      },
      {
        name:"endWith",
        test:!(/\.$/.test(value)),
        msg:"\nThe name cannot end with a period."
      }
    ];
    var msg = "";
    for(var i in rules) if(!rules[i].test) msg += rules[i].msg;
    return msg.length ? msg:true;
  }

};

Init.prototype.setDependenciesInstall = function(resolve,reject){
  for(var group of ['local','global']){
    for(var dep of this.data.dependencies[group]){
      dep.install = this.formData.dependencies[dep.name];
    }
  }
  resolve();
};


Init.prototype.ensureDir = function(resolve,reject){
/* Create project root directory, if not exists
 * Check if the root directory is accessible
 */
  this.data.projectPath = path.resolve(this.data.installPath,this.formData.package.name);
  fileAssistant(this.data.projectPath,[],(o)=>{
    if(o.error) return reject(cliError(o.error.message));
    return resolve();
  });
};

Init.prototype.preventOverwritePath = function(resolve,reject){
/* it checks whether the chosen installation path - if exists - contains some files or folders
 * if so - it warns the user, that those files/folders may be overwritten
 */
    fileAssistant.compare(this.data.templatePath,this.data.projectPath,(err,data)=>{
      if(err) return reject(cliError(err.message));
      const ex = data.files.existing;
      const ln = ex.length;
      if(!ln) return resolve();
      var warnMessage = 'The installation directory contains some files that will be overwritten:\n';
      const warnQuestion = 'Do you want to continue?';
      for(var i=0;i<ln;i++){
        warnMessage += cliPath(`'${ex[i]}'`);
        if(i===10){
          warnMessage += `,\n...\nand ${ln-i} more. ${warnQuestion}`;
          break;
        }
        warnMessage += i<ln-1 ? ',\n':'.\n' + warnQuestion;
      }

      inquirer.prompt({
        type:'confirm',
        'default':false,
        name:'confirm',
        message:warnMessage
      }).then((answer)=>{
        if(!answer.confirm) return reject();
        resolve();
      });
    });
};


Init.prototype.mergeTemplateFiles = function(resolve,reject){
/* Copy all files and folders from global node_modules/componental/template
 * Create the structure of the new project with already configured files
 */
  console.log(`Generating the new project structure...`);
  
  const t = this.data.templatePath;
  const structure = [
    {dir:'helpers', contents:[
      //remove is useless!!! because all data are appended to the files in the init process
      //storing this data in the project/helpers.html.json file may turn out useless
      {file:'tests.json', write:this.utils.toJSON(this.formData.tests), overwrite:true},
      {file:'html.json', write:this.utils.toJSON(Object.assign({},this.formData.package,this.formData.html)), overwrite:true},
      {file:'components.json', write:this.utils.toJSON([{name:this.formData.components.entry,entry:true}]), overwrite:true}
    ]},
    {dir:'templates', contents:[
      {file:'controller.js', copy:path.resolve(t,'templates/controller.js'), overwrite:true},
      {file:'data.js', copy:path.resolve(t,'templates/data.js'), overwrite:true},
      {file:'data.json', copy:path.resolve(t,'templates/data.json'), overwrite:true},
      {file:'entry.html', copy:path.resolve(t,'templates/entry.html'), overwrite:true},
      {file:'favicon.png', copy:path.resolve(t,'templates/favicon.png'), overwrite:true},
      {file:'styles.scss', copy:path.resolve(t,'templates/styles.scss'), overwrite:true},
      {file:'template.html', copy:path.resolve(t,'templates/template.html'), overwrite:true},
      {file:'test.js', copy:path.resolve(t,'templates/test.js'), overwrite:true},
      {file:'test-dom.js', copy:path.resolve(t,'templates/test-dom.js'), overwrite:true}
    ]},
    {dir:'src', contents:[
      {dir:'data'},
      {dir:'fonts'},
      {dir:'images'},
      {dir:'scripts'},
      {dir:'styles'},
      {dir:'templates'},
      {dir:'tests'}
    ]},
    {file:'package.json', copy:path.resolve(t,'package.json'), beforeWrite:this.handlers.updatePackageJson.bind(this), overwrite:true},
    {file:'.gitignore', copy:path.resolve(t,'git-ignore'), overwrite:true},
    {file:'.npmignore', copy:path.resolve(t,'npm-ignore'), overwrite:true},
    {file:'.npmrc', copy:path.resolve(t,'npm-rc'), overwrite:true},
    {file:'LICENSE', copy:path.resolve(t,'LICENSE'), overwrite:true},
    {file:'readme.md', copy:path.resolve(t,'readme.md'), overwrite:true},
    {file:'webpack.config.js', copy:path.resolve(t,'webpack.config.js'), overwrite:true},
    {file:'karma.conf.js', copy:path.resolve(t,'karma.conf.js'), overwrite:true},
    {file:'tsconfig.json', copy:path.resolve(t,'tsconfig.json'), overwrite:true}
  ];

  fileAssistant(this.data.projectPath,structure,onDone,onEach);

  function onDone(o){
    if(o.error) return reject(cliError(`Could not find some files in the ${npmName} package directory. Reinstall package and try again.\n`)+`npm install -g ${npmName}`);
    if(!o.dirs.failure.length&&!o.files.failure.length) return resolve();
    return reject(cliError(`Some elements could not be added. The initiation process was aborted.`));
  }
  
  function onEach(o){
    if(o.success) console.log(cliPath(`The '${o.relative}' ${o.item==='file'?'file':'folder'} added.`));
    if(o.failure) console.log(cliError(o.failure));
  }
};




Init.prototype.handlers = {
  updatePackageJson:function(data,resolve,reject){
  /* it takes the formData data passed by the user and update the package.json with those data
   */
  var packageData;
    try{
      packageData = JSON.parse(data);
    } catch(err){
      return reject(`Reinstall ${npmName} package and try again.`);
    }
    
    updatePackageData.call(this);
    updateDependencies.call(this);
    updateScriptPostInstall.call(this);
    resolve(this.utils.toJSON(packageData));

      function updatePackageData(){
        for(var prop of Object.getOwnPropertyNames(this.formData.package)){
          packageData[prop] = this.formData.package[prop];
        }
      }

      function updateDependencies(){
        for(var dep of this.data.dependencies.local){
          if(dep.install) packageData.devDependencies[dep.package] = dep.version;
        }
      }

      function updateScriptPostInstall(){
        var iter = 0;
        //if postinstall already exists it just add new packages to it
        //if does not exists, it will be created
        var postinstall = packageData.scripts.postinstall ? '':'npm link'; 
        for(var dep of this.data.dependencies.global){
          if(dep.install){
            postinstall += ` ${dep.package}@${dep.version}`;
            iter++;
          }
        }
        if(iter) packageData.scripts.postinstall = postinstall;
      }

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
  },
  readJSON:function(getPath,callback){
    fs.readFile(getPath, 'utf8', (err,data)=>{
      if(err) return callback(err,null);
      callback(null,JSON.parse(data));
    });
  },
  toJSON:function(getpath){
    return JSON.stringify(getpath,null,2);
  }
};