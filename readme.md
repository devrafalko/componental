# Description
The `componental` package is a very light library to create, control and to manage the structure of your new project.
The `componental` package generates the project structure that is based on:
* componental structure
* webpack
* typescript support
* ES6 support
* SASS support
* Karma + Jasmine support
* DOM tests support

# Installation

The `componental` package **must** be installed **globally**.
```
npm install -g componental
```

# Usage
The most convenient way of explaining all the `componental` features would be to create a small project step-by-step.   
Follow the steps below and discover all the available features.

#### I. Init new project
As we already have got the `componental` installed globally, lets create our new project template.

##### 1. Run you **terminal** and run the `compo init` command
```
> compo init
```
##### 2. Now you are asked to fill the form with the data, that will be essential to generate the new `componental` project.  
   *If you input the incorrect value, the creating process is not aborted. You are warned and asked to set the valid one instead.*
  * **Install path**: The location, where the new project will be created. *(The current path is the default)*.
  * **Project name**: The new project folder of this name will be created in the chosen `install path` directory. This name will be also used in the `package.json` file as the project `name`.
  * **Project version** The version of the project, stored in the `package.json`
  * **License** The license type stored in the `package.json`
  * **Author** The author of the project. This data will be used in the `package.json` and `<meta name="author"/>` html templates of the project.
  * **Description** The project description, stored in the `package.json` file and `<meta name="description"/>` html templates of the project.
  * **Keywords** The space separated project keywords, stored in the `package.json` file and `<meta name="keywords"/>` html templates of the project.
  * **HTML Title** The title of the project, used in the `<head><title></title></head>` html templates of the project.
  * **Entry-component name** The name of the first entry-point component of the project, that will be automatically created.
  * **Test browsers** This information will be used by `Karma` framework. The chosen browsers will be used to test the project.
  * **Addons** If you are going to use `jQuery 3.2.1`, `jQuery UI`, `Bootstrap 3` or/and `Bootstrap Glyphicons`, `Google material-design-icons`, `font-awesome icons`, choose the right option(s).

##### 3. You can also create new `componental` project without filling the form. You can run `compo init` command with the following arguments and values.
  * Mind, that if any of the arguments is omitted, the default value is used.
  * Mind, that if the given value of any argument is invalid, the creating proces is aborted.

| Argument | Values | Default | Description |
| :-------------: |:-------------:|:-----:|:-----:|
| `--path` `-p`      | `<path>` | `"./"` | The `install path` directory. |
| `--name` `-n`      | `<name>`      | `"new-project-1"` | The `project name`. |
| `--version` `-v` | `<version>` | `"1.0.0"` | The `project version`. It must meet the versioning rules. |
| `--license` `-l` | `<license>` | `"MIT"` | The project `license`. It must be a valid [SPDX](https://spdx.org/licenses) license expression. |
| `--author` `-a` | `<author>` | `""` | The `author` of the project. |
| `--desc` `-d` | `<description>` | `""` | The `description` of the project. |
| `--kwrd` `-k` | `<keywords>` | `""` | The project `keywords`, separated with the spaces. |
| `--title` `-t` | `<title>` | `""` | The project `title`. |
| `--entry` `-e` | `<entry-component name>` | `"index"` | The project `entry-component name`. |
| `--browsers` `-b` | `chrome`, `firefox`, `edge`, `opera`, `phantomjs`, `chromecanary`, `ie`, `safari` | `"chrome"` | The project `test browsers`. Type one or more *(space separated)* values. |
| `--addons` `-ad`  | `jquery`, `jqueryui`, `bootstrap3`, `icons` | `""` | The project `addons`. Type one or more *(space separated)* values. By default, any additional dependencies are installed. |
Examples:
```
> compo init --path "./projects" --name "soccer" --browsers "chrome" "firefox" --addons "jquery" "icons"
> compo init -p ./projects -b math-ai -a "John Doe" -a jquery icons -v "0.1.0"
```

##### 4. If you want to create new `componental` project automatically with all default settings, run:
```
> compo init --yes
> compo init -y
```