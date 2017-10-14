/* global __dirname, this, Promise, Function */

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
const listContents = require('list-contents');
const dependencies = require(path.resolve(root,'data/dependencies.json'));
const browsers = require(path.resolve(root,'data/browsers.json'));
const initArguments = require(path.resolve(root,'data/cli-arguments.json')).init;

const npmData = require(path.resolve(root,'package.json'));
const npmBinCommand = Object.keys(npmData.bin)[0];
const npmName = npmData.name;
const projectName = 'new-project';
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
      process:{},
      paths:{
        rootPath:root,
        templatePath:path.resolve(root,'template'),
        currentPath: process.cwd()
      },
      cliData:{
        cliArguments: cliArguments,
        initArguments: initArguments
      },
      browsersData:{
        browsers: browsers
      },
      dependenciesData:{
        dependencies: dependencies
      },
      formData:{
        package:{},
        html:{},
        components:[],
        tests:{},
        dependencies:{}
      }
    };
    
    const functionQueue = [
      this.parseArguments,
      this.determineInstallPath,
      this.determineProjectPath,
      this.preventOverwritePath,
      this.determineNpmData,
      this.determineComponentsData,
      this.determineTestsData,
      this.determineDependenciesData,
      this.mergeTemplateFiles
    ];

    moveOn(functionQueue,userContext,onDone,onCatch);


    function onDone(){
      console.log(cliPath(`\nThe new ${npmName} project was successfully created.`));
    }

    function onCatch(c,err){
      const msg = err || cliError(`The initiation process was aborted.`);
      return console.error(msg);
    }

  };
}

Init.prototype.parseArguments = function(resolve,reject){
  this.handlers.computeBrowsersList.call(this);
  this.handlers.computeDependenciesList.call(this);
  this.handlers.computeArgumentsObject.call(this);

  const props = Object.getOwnPropertyNames(this.cliData.cliArguments);
  const isArr = type(this.cliData.cliArguments,Array);
  const isObj = type(this.cliData.cliArguments,Object);
  if(isArr&&this.cliData.cliArguments.length===0){
    this.process.form = true;
    console.log("\nFill out the form with the data that will be used to generate a new componental project.\n");
    return resolve();
  } else if(isObj&&props.length===1&&(props[0]==='--yes'||props[0]==='-y')){
    this.process.auto = true;
    return resolve();
  } else {
    this.handlers.validateCliArguments.call(this,(err)=>{
      if(err) return reject(err);
      this.process.args = true;
      return resolve();
    });
  }
};





Init.prototype.determineInstallPath = function(resolve,reject){
  const queryData = [
    {name:'path', default:process.cwd(), filter:filterInstallPath}
  ];

  if(this.process.form) inquirer.prompt(this.handlers.computeFormQueries.call(this,queryData)).then(resolve);
  if(this.process.auto||this.process.args) this.handlers.computeArgumentsData.call(this,queryData,resolve,reject);

    function filterInstallPath(userPath){
      return new Promise((resolve,reject)=>{
        const resolved = path.resolve(this.paths.currentPath,userPath);
        fileAssistant.ensureDir(resolved,(err)=>{
          if(err) return reject(cliError(err.message));
          this.paths.installPath = resolved;
          return resolve(resolved);
        });
      });
    }
};

Init.prototype.determineProjectPath = function(resolve,reject){
  const queryData = [
    {name:'name', default:setDefaultProjectName, filter:filterProjectName}
  ];

  if(this.process.form) inquirer.prompt(this.handlers.computeFormQueries.call(this,queryData)).then(resolve);
  if(this.process.auto||this.process.args) this.handlers.computeArgumentsData.call(this,queryData,resolve,reject);

    function setDefaultProjectName(){
      return new Promise((resolve)=>{
        listContents(this.paths.installPath,{deep:1},(o)=>{
          if(o.error) return resolve(null);
            const elements = o.dirs.concat(o.files,o.inaccessible);
            var iter = 1, finalName = null;
            while(true){
              var nextName = `${projectName}-${iter}`;
              if(elements.indexOf(nextName)>=0){
                iter++;
              } else {
                finalName = nextName;
                break;
              }
            }
            return resolve(finalName);
        });
      });
    }

    function filterProjectName(userInput){
      return new Promise((resolve,reject)=>{
        const rules = [
          {
            name:"length",
            test:/^.{1,214}$/.test(userInput),
            msg:"The name must contain at least 1 and at most 214 characters.\n"
          },
          {
            name:"upperCase",
            test:!(/[A-Z]/.test(userInput)),
            msg:"The name cannot contain capital letters.\n"
          },
          {
            name:"chars",
            test:/^[a-z0-9_.-]+$/.test(userInput),
            msg:"The name must contain only url-safe characters [a-z0-9_-.].\n"
          },
          {
            name:"startWith",
            test:!(/^[._]/.test(userInput)),
            msg:"The name cannot begin with period or underscore.\n"
          }
        ];
        var msg = "";
        for(var i in rules) if(!rules[i].test) msg += rules[i].msg;
        if(msg.length) return reject(msg);

        const resolved = path.resolve(this.paths.installPath,userInput);
        fileAssistant.ensureDir(resolved,(err)=>{
          if(err) return reject(cliError(err.message));
          this.paths.projectPath = resolved;
          this.formData.package.name = userInput;
          return resolve(userInput);
        });
      });
    }

};

Init.prototype.preventOverwritePath = function(resolve,reject){
  const functionList = [
    initialCompare,
    finalCompare,
    generateMessage
  ];
  const userContext = {
    paths:this.paths
  };

  moveOn(functionList,userContext,onDone,onCatch);
  
  function onDone(){
    resolve();
  }
  function onCatch(c,err){
    return reject(cliError(err.message));
  }

  function initialCompare(resolve,reject){
    const config = {depth:1};
    fileAssistant.compare(this.paths.templatePath,this.paths.projectPath,config,(err,o)=>{
      if(err) return reject(err);
      this.excluded = o.dirs.extraneous;
      resolve();
    });
  }

  function finalCompare(resolve,reject){
    const config = {depth:null,exclude:this.excluded};
    fileAssistant.compare(this.paths.templatePath,this.paths.projectPath,config,(err,data)=>{
      if(err) return reject(err);
      this.existing = data.files.existing;
      resolve();
    });
  }

  function generateMessage(resolve,reject){
    const ex = this.existing;
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
      if(!answer.confirm) return reject(new Error('The initiation process was aborted.'));
      resolve();
    });    
  }
};

Init.prototype.determineNpmData = function(resolve,reject){
  if(this.process.form){
    const queryDataForm = [
      {name:'version', validate:validateVersion},
      {name:'license', validate:validateLicense},
      {name:'author', 'default':null, validate:validateAuthor},
      {name:'description', 'default':null, validate:validateDescription},
      {name:'keywords', 'default':null, filter:filterKeywords},
      {name:'title', 'default':null, validate:validateTitle}
    ];
    inquirer.prompt(this.handlers.computeFormQueries.call(this,queryDataForm)).then(resolve);
  }
  if(this.process.auto||this.process.args){
    const queryDataCli = [
      {name:'version', validate:validateVersion},
      {name:'license', validate:validateLicense},
      {name:'author', validate:validateAuthor},
      {name:'description', validate:validateDescription},
      {name:'keywords', filter:filterKeywords},
      {name:'title', validate:validateTitle}
    ];
    this.handlers.computeArgumentsData.call(this,queryDataCli,resolve,reject);
  }

    function validateVersion(version){
      return new Promise((resolve,reject)=>{
        const condition = type(semver.valid(version),String);
        if(!condition) return reject("Invalid version.");
        if(condition) {
          this.formData.package.version = version;
          return resolve(true);
        }
      });
    }

    function validateLicense(value){
      return new Promise((resolve,reject)=>{
        const condition = type(license(value),String);
        if(!condition) return reject(`The license should be a valid SPDX license expression. Visit ${cliKey('https://spdx.org/licenses')}`);
        if(condition) {
          this.formData.package.license = value;
          return resolve(true);
        }
      });
    }

    function filterKeywords(keywords){
      return new Promise((resolve)=>{
        const keywordsList = type(keywords,String) ? keywords.split(' ').filter((b)=>b.length):keywords;
        this.formData.package.keywords = keywordsList;
        this.formData.html.keywords = keywords;
        resolve(keywordsList);
      });
    }

    function validateAuthor(author){
      return new Promise((resolve)=>{
        this.formData.package.author = author;
        this.formData.html.author = author;
        resolve(true);
      });
    }

    function validateDescription(description){
      return new Promise((resolve)=>{
        this.formData.package.description = description;
        this.formData.html.description = description;
        resolve(true);
      });
    }

    function validateTitle(title){
      return new Promise((resolve)=>{
        this.formData.html.title = title;
        resolve(true);
      });
    }

};


Init.prototype.determineComponentsData = function(resolve,reject){
  const queryData = [
    {name:'entry', validate:validateComponentName}
  ];

  if(this.process.form) inquirer.prompt(this.handlers.computeFormQueries.call(this,queryData)).then(resolve);
  if(this.process.auto||this.process.args) this.handlers.computeArgumentsData.call(this,queryData,resolve,reject);

    function validateComponentName(value){
      const rules = [
        {
          name:"length",
          test:/^.{1,214}$/.test(value),
          msg:"The component name must contain at least 1 and at most 214 characters.\n"
        },
        {
          name:"chars",
          test:/^[A-Za-z0-9$@_.-]+$/.test(value),
          msg:`The component name must contain only letters, numbers and the following chars: ${cliKey('_.-$@')}\n`
        },
        {
          name:"startWith",
          test:!(/^\./.test(value)),
          msg:"The component name cannot begin with a period.\n"
        },
        {
          name:"endWith",
          test:!(/\.$/.test(value)),
          msg:"The component name cannot end with a period.\n"
        }
      ];
      return new Promise((resolve,reject)=>{
        var msg = "";
        for(var i in rules) if(!rules[i].test) msg += rules[i].msg;
        if(msg.length) return reject(msg);
        if(!msg.length){
          this.formData.components.push({name:value,entry:true});
          return resolve(true);
        }
      });
    }
  
};

Init.prototype.determineTestsData = function(resolve,reject){
  if(this.process.form){
    inquirer.prompt([{
    name:'browsers',
    type:'checkbox',
    message:`Check the browser(s) for tests:\n`,
    'default':determineDefaultBrowsers.call(this),
    pageSize:20,
    choices:this.browsersData.browsersListForm,
    filter:computeBrowsersData.bind(this)
  }]).then(resolve);
  }

  if(this.process.auto||this.process.args){
    const queryData = [
      {name:'browsers', default:determineDefaultBrowsers.call(this), filter:computeBrowsersData}
    ];
    this.handlers.computeArgumentsData.call(this,queryData,resolve,reject);
  }

    function computeBrowsersData(formData){
      return new Promise((resolve,reject)=>{
        const errorMessage = 'At least one browser must be chosen.';
        if(!formData.length) return reject(errorMessage);
        const packages = {};
        const karmaBrowsers = [];
        const formOrCli = this.process.form ? 'valueForm':'valueCli';
        for(var item of formData){
          for(var i in this.browsersData.browsers){
            const browser = this.browsersData.browsers[i];
            if(browser[formOrCli]===item){
              packages[browser.package] = browser.version;
              karmaBrowsers.push(browser.valueKarma);
            }
          }
        }
        if(!karmaBrowsers.length) return reject(errorMessage);
        this.formData.tests.packages = packages;
        this.formData.tests.karmaBrowsers = karmaBrowsers;
        return resolve(karmaBrowsers.join(','));
      });
    }

    function determineDefaultBrowsers(){
      const cliOrForm = this.process.form ? 'valueForm':'valueCli';
      const list = [];
      for(var i in this.browsersData.browsers){
        const browser = this.browsersData.browsers[i];
        if(browser.default) list.push(browser[cliOrForm]);
      }
      return list;
    }
};

Init.prototype.determineDependenciesData = function(resolve,reject){
  if(this.process.form){
    inquirer.prompt([{
    name:'addons',
    type:'checkbox',
    message:`Check the libraries that will be added to the new ${npmName} project:\n`,
    'default':determineDefaultDependencies.call(this),
    pageSize:20,
    choices:this.dependenciesData.allForm,
    filter:computeDependenciesData.bind(this)
  }]).then(resolve);
  }

  if(this.process.auto||this.process.args){
    const queryData = [
      {name:'addons', default:determineDefaultDependencies.call(this), filter:computeDependenciesData}
    ];
    this.handlers.computeArgumentsData.call(this,queryData,resolve,reject);
  }

    function determineDefaultDependencies(){
      const cliOrForm = this.process.form ? 'valueForm':'valueCli';
      const list = [];
      for(var i in this.dependenciesData.dependencies){
        const dep = this.dependenciesData.dependencies[i];
        if(dep.default) list.push(dep[cliOrForm]);
      }
      return list;
    }

    function computeDependenciesData(values){
      return new Promise((resolve)=>{
        const formOrCli = this.process.form ? 'valueForm':'valueCli';
        const locals = {}, globals = {}, chosenList = [];
        for(var item of values){
          for(var i in this.dependenciesData.dependencies){
            const dep = this.dependenciesData.dependencies[i];
            if(dep[formOrCli]===item){
              if(dep.global) globals[dep.package] = dep.version;
              if(!dep.global) locals[dep.package] = dep.version;
              chosenList.push(dep.valueForm);
            }
          }
        }
        this.formData.dependencies.globalPackages = globals;
        this.formData.dependencies.localPackages = locals;
        return resolve(chosenList.join(','));
      });
    }
};

Init.prototype.mergeTemplateFiles = function(resolve,reject){
  console.log(`Generating the new project structure...`);

  const t = this.paths.templatePath;
  const structure = [
    {dir:'data', contents:[
      {file:'karma.json', write:this.utils.toJSON(this.formData.tests.karmaBrowsers), overwrite:true},
      {file:'html.json', write:this.utils.toJSON(this.formData.html), overwrite:true},
      {file:'components.json', write:this.utils.toJSON(this.formData.components), overwrite:true}
    ]},
    {dir:'templates', copy:path.resolve(t,'templates'), overwrite:true},
    {dir:'components'},
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
    {file:'.gitignore', copy:path.resolve(t,'.gitignore'), overwrite:true},
    {file:'.npmignore', copy:path.resolve(t,'.npmignore'), overwrite:true},
    {file:'.npmrc', copy:path.resolve(t,'.npmrc'), overwrite:true},
    {file:'LICENSE', copy:path.resolve(t,'LICENSE'), overwrite:true},
    {file:'readme.md', copy:path.resolve(t,'readme.md'), overwrite:true},
    {file:'webpack.config.js', copy:path.resolve(t,'webpack.config.js'), overwrite:true},
    {file:'karma.conf.js', copy:path.resolve(t,'karma.conf.js'), overwrite:true},
    {file:'tsconfig.json', copy:path.resolve(t,'tsconfig.json'), overwrite:true}
  ];

  fileAssistant(this.paths.projectPath,structure,onDone,onEach);

  function onDone(o){
    if(o.error) return reject(cliError(`Could not find some files in the ${npmName} package directory. The initiation process was aborted. Reinstall package and try again.\n`)+`npm install -g ${npmName}`);
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
  var packageData;
    try{
      packageData = JSON.parse(data);
    } catch(err){
      return reject(`Could not modify package.json file. Reinstall ${npmName} package and try again.`);
    }

    updatePackageData.call(this);
    updateKarmaBrowsersDependencies.call(this);
    updateLocalDependencies.call(this);
    updateGlobalDependencies.call(this);
    resolve(this.utils.toJSON(packageData));

      function updatePackageData(){
        for(var i in this.formData.package){
          packageData[i] = this.formData.package[i];
        }
      }

      function updateKarmaBrowsersDependencies(){
        for(var i in this.formData.tests.packages){
          packageData.devDependencies[i] = this.formData.tests.packages[i];
        }
      }

      function updateLocalDependencies(){
        for(var i in this.formData.dependencies.localPackages){
          packageData.devDependencies[i] = this.formData.dependencies.localPackages[i];
        }
      }
      
      function updateGlobalDependencies(){
        const globals = this.formData.dependencies.globalPackages;
        if(!Object.keys(globals).length) return;
        var value = 'npm link';
        for(var i in this.formData.dependencies.globalPackages){
          value += ` ${i}@${this.formData.dependencies.globalPackages[i]}`;
        }
        packageData.scripts.postinstall = value;
      }
  },
  computeBrowsersList: function(){
    const cliList = [];
    const formList = [];
    for(var b in this.browsersData.browsers){
      cliList.push(this.browsersData.browsers[b].valueCli);
      formList.push(this.browsersData.browsers[b].valueForm);
    }
    this.browsersData.browsersListCli = cliList;
    this.browsersData.browsersListForm = formList;
  },
  computeDependenciesList: function(){
    const data = this.dependenciesData;
    data.globalCli = [];
    data.globalForm = [];
    data.localCli = [];
    data.localForm = [];
    data.allCli = [];
    data.allForm = [];
    for(var i in data.dependencies){
      const dep = data.dependencies[i];
      data[dep.global ? 'globalCli':'localCli'].push(dep.valueCli);
      data[dep.global ? 'globalForm':'localForm'].push(dep.valueForm);
      data.allCli.push(dep.valueCli);
      data.allForm.push(dep.valueForm);
    }
  },
  
  computeArgumentsObject: function(){
    const cliData = {};
    const getValues = this.cliData.cliArguments;
    const getArgs = this.cliData.initArguments;
    for(var i in getArgs){
      cliData[i] = getValues[getArgs[i].name] || getValues[getArgs[i].abbr] || null;
    }
    this.cliData.cliArgumentsData = cliData;
  },
  validateCliArguments: function(callback){
    const model = [];
    const compared = Object.getOwnPropertyNames(this.cliData.cliArguments);
    for(var i in this.cliData.initArguments){
      model.push(this.cliData.initArguments[i].name,this.cliData.initArguments[i].abbr);
    }

    const returned = compare(model,compared) ? null:this.handlers.createBashTable.call(this);
    callback(returned);
    
    function compare(model,compared){
      for(var i of compared) if(!model.some((x)=>x===i)) return false;
      return true;
    }

  },
  createBashTable: function(){
    const c = this.cliData.initArguments;
    c.addons.values = this.dependenciesData.dependenciesList.cli.join('|');
    c.browsers.values = this.browsersData.browsersListCli.join('|');

    var computedMessage = `Use ${cliKey('compo init')} with the following arguments:`;
    var lName = 0, lAbbr = 0, lValue = 0, space = 4;

    for(var i in c){
      lName = c[i].name.length>lName ? c[i].name.length:lName;
      lAbbr = c[i].abbr.length>lAbbr ? c[i].abbr.length:lAbbr;
      lValue = c[i].values.length>lValue ? c[i].values.length:lValue;
    }
    for(var i in c) computedMessage += '\n' + c[i].name + sp(lName - c[i].name.length)
                                    + c[i].abbr + sp(lAbbr - c[i].abbr.length)
                                    + c[i].values;
    return computedMessage;

    function sp(num){
      var msg = '';
      for(var i = 0;i<num+space;i++) msg+=' ';
      return msg;
    }
  },
  validateCliValues: function(o){
    const getVal = this.cliData.cliArgumentsData[o.argument]; //null or array with all values got by the user
    var setVal;
    if(type(getVal,Array)){
      const vType = this.cliData.initArguments[o.argument].valueType;
      /*when the user type the non-boolean argument without any value*/
      if(!getVal.length&&!vType.boolean) return o.reject(cliError(o.errorMessage));
      /*when the user can define more than one value*/
      if(getVal.length&&vType.multi) setVal = this.cliData.cliArgumentsData[o.argument];
      /*when the user is expected to define only one value and further are ignored*/
      if(getVal.length&&!vType.multi) setVal = this.cliData.cliArgumentsData[o.argument][0];
    }
    if(type(getVal,null)) setVal = o.defaultValue;
    if(type(setVal,undefined)) return o.resolve();
    if(type(setVal,Function)) setVal = setVal();
    if(type(setVal,Promise)){
      setVal.then((val)=>{
        filter.call(this,val);
      });
    } else {
      filter.call(this,setVal);
    }

    function filter(val){
      o.filterFunction.call(this,val)
      .then(o.resolve)
      .catch((err)=>{
        o.reject(cliError(err));
      });
    }
  },
  computeFormQueries: function(queryData){
    const queryObject = [];
    for(var ob of queryData){
      queryObject.push({
        name:ob.name,
        type:'input',
        message:this.cliData.initArguments[ob.name].formMessage,
        'default':ob.hasOwnProperty('default') ? type(ob.default,Function) ? ob.default.bind(this):ob.default:this.cliData.initArguments[ob.name].default,
        validate:type(ob.validate,Function) ? ob.validate.bind(this):ob.validate,
        filter:type(ob.filter,Function) ? ob.filter.bind(this):ob.filter
      });
    }
    return queryObject;
  },
  computeArgumentsData: function(queryData,resolve,reject){
    var iterator = 0;
    for(var ob of queryData){
      this.handlers.validateCliValues.call(this,{
        argument:ob.name,
        defaultValue:ob.hasOwnProperty('default') ? type(ob.default,Function) ? ob.default.bind(this):ob.default:this.cliData.initArguments[ob.name].default,
        errorMessage:`The ${ob.name} argument is not valid.`,
        filterFunction:ob.validate || ob.filter || null,
        resolve:all,
        reject:reject
      });
    }
    function all(){
      if(++iterator===queryData.length) return resolve();
    }
  }
};

Init.prototype.utils = {
  toJSON:function(getpath){
    return JSON.stringify(getpath,null,2);
  }
};