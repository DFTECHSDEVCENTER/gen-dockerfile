#!/usr/bin/env node

const fs = require("fs");
var inquirer = require("inquirer");
const path = require("path");
const existingConfig = fs.existsSync("Dockerfile");
const generator = require('dockerfile-generator')
var installerSc = null;
var lang = null;
var framework = null;
let inputConfig =     {
  "from": {},
  "working_dir": "",
  "copy":  [],
  "run": ""
}

function buildOS() {
  inquirer
    .prompt([
      {
        type: "list",
        name: "osType",
        message: "What should be your Base OS Image ?",
        choices: [
          "Ubuntu Based",
          "Debian Based",
          "Clear Linux Based",
          "Alpine Based",
        ],
      },
    ])
    .then((answers) => {
      if (answers.osType) {
        const osType = answers.osType;
        switch(osType) {
            case 'Ubuntu Based' :
              inputConfig.run = "sudo apt install -y --no-install-recommends ";
              inputConfig.from = { "baseImage" : "dftechs/ubuntu-dev"};
              break;

            case 'Debian Based' :
              inputConfig.run = "sudo apt-get install -y --no-install-recommends ";
              inputConfig.from = { "baseImage" : "dftechs/debian-dev" };
              break;

            case 'Clear Linux Based' :
              inputConfig.run = "sudo swupd bundle-add ";
              inputConfig.from = { "baseImage" : "dftechs/clearlinux-dev"};
              break;

            case 'Alpine Based' :
              inputConfig.run = "sudo apk add --update --no-cache ";
              inputConfig.from = { "baseImage" : "dftechs/alpine-dev" };
              break;
        }

        buildLang();
      } else {
        console.log("Goodbye 👋");
      }
    });
}

function buildLang() {
  let depencyDescriptor;
  let packagesMap = {
    "Ruby": {
      "dftechs/ubuntu-dev": "ruby",
      "dftechs/debian-dev": "ruby",
      "dftechs/clearlinux-dev": "ruby-basic",
      "dftechs/alpine-dev": "ruby"
    },
    "Python3": {
      "dftechs/ubuntu-dev": "python3 python3-pip",
      "dftechs/debian-dev": "python3 python3-pip",
      "dftechs/clearlinux-dev": "python3-basic",
      "dftechs/alpine-dev": "python3 && ln -sf python3 /usr/bin/python && python3 -m ensurepip"
    },
    "Nodejs": {
      "dftechs/ubuntu-dev": "nodejs npm",
      "dftechs/debian-dev": "nodejs npm",
      "dftechs/clearlinux-dev": "nodejs-basic",
      "dftechs/alpine-dev": "nodejs npm"
    }
  };
  inquirer
    .prompt([
      {
        type: "list",
        name: "appType",
        message: "What is Project's Application Type ?",
        choices: ["Nodejs", "Python3", "Ruby"],
      },
    ])
    .then((answers) => {
      lang = answers.appType;
      if (answers.appType) {
        switch(answers.appType) {
            case 'Nodejs' :
              installerSc = 'npm install';
              depencyDescriptor = ['package.json'];
              break;

            case 'Python3' :
              installerSc = 'pip install -r requirements.txt';
              depencyDescriptor = ['requirements.txt'];
              break;

            case 'Ruby':
              installerSc = 'gem install bunlder && bundle install';
              depencyDescriptor = ['Gemfile', 'Gemfile.lock'];
              break;
        }

        console.log(installerSc);

        for (let descriptor of depencyDescriptor) {
          inputConfig.copy[descriptor] = '.' ;
        }

        inputConfig.run += packagesMap[answers.appType][inputConfig.from["baseImage"]];
        inputConfig.run += ` && ${installerSc}`;
        useFramework();
      } else {
        console.log("Goodbye 👋");
      }
    });
}

function useFramework() {
  inquirer
    .prompt([
      {
        type: "confirm",
        name: "useFramework",
        message: "Are you using any predefined framework ?",
      },
    ])
    .then((answers) => {
      if (answers.useFramework) {
        buildFramework();
      } else {
        enablePort();
      }
    });
}

function buildFramework() {
  let frameworkChoices = {
    "Python3": ["Django", "Flask", "Other"],
    "Nodejs": ["Express", "Hexo", "Hugo", "Other"],
    "Ruby": ["Rails", "Sinatra", "Other"]
  };

  inquirer
    .prompt([
      {
        type: "list",
        name: "appFramework",
        message: "What framework is it ?",
        choices: frameworkChoices[lang],
      },
    ])
    .then((answers) => {
      if (answers.appFramework) {
        framework = answers.appFramework;
      }

      enablePort();
    });
}

function buildEnvPort() {
  inquirer
    .prompt([
      {
        type: "text",
        name: "envPort",
        message: "What PORT do you want to expose ?",
        default: `${lang === 'Nodejs' ? 3000 : lang === 'Python3' ? 5000 : 3030}`,
      },
    ])
    .then((answers) => {
      if (answers.envPort) {
        inputConfig.expose = [answers.envPort];
        copySrc();
      } else {
        console.log("Goodbye 👋");
      }
    });
}

function finalCMD() {
  let starter;
  inquirer
    .prompt([
      {
        type: "text",
        name: "entryPoint",
        message: "Which file initiates your app ?",
        default: `${lang === 'Nodejs' ? 'index.js' : lang === "Python3" ? 'main.py' : 'main.rb'}`,
      },
    ])
    .then((answers) => {
      var stFile = answers.entryPoint;
      switch(lang){
        case 'Nodejs':
          starter = "node";
          break;

        case 'Python3':
          starter = "python3";
          break;

        case 'Ruby':
          starter = "ruby";
          break;
      }
      inputConfig.cmd = [starter , stFile ];
      console.log(answers);
      buildFile();
    });
}

function enablePort() {
  inquirer
    .prompt([
      {
        type: "confirm",
        name: "enbPort",
        message: "Do you want to Expose Ports ?",
      },
    ])
    .then((answers) => {
      console.log(answers);
      if (answers.enbPort) {
        buildEnvPort();
      } else {
        copySrc();
      }
    });
}


function copySrc(){
  inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'));
  inquirer.prompt([
    {
      type: 'fuzzypath',
      name: 'path',
      excludePath: nodePath =>  nodePath.startsWith('node_modules') || nodePath.includes('git'),
      excludeFilter: nodePath => nodePath == '.',
      itemType: 'directory',
      rootPath: '.',
      message: 'select a source directory of your component:',
      default: `.`,
      suggestOnly: false,
      depthLimit: 0,
    }
  ])
  .then((answers) => {
    if(answers.path === '.'){
      inputConfig.copy = [];
    }
    inputConfig.copy[answers.path] = '.';
    finalCMD();
  })
}

function buildFile(){
  generator.generate(inputConfig).then((response) =>
  {

    fs.writeFile(`${process.cwd()}/Dockerfile`,response, (err) => {
      if(err) {
        console.log('Error to create Dockerfile');
        return;
      }
      console.log('File created successfully 🚀');
      console.log("Goodbye 👋");
    });
  })
  .catch(err => console.log("Error to generate Dockerfile"));

}


function buildAppName() {
  inquirer
    .prompt([
      {
        type: "text",
        name: "appName",
        message: "What is Project Name ?",
        default: path.basename(process.cwd()),
      },
    ])
    .then((answers) => {
      if (answers.appName) {
        inputConfig.working_dir = answers.appName;
        buildOS();
      } else {
        console.log("Goodbye 👋");
      }
    });
}

const questions = [];
if (existingConfig) {
  inquirer
    .prompt([
      {
        type: "confirm",
        name: "existing",
        message:
          "Your Dockerfile already exists !! Do you want to replace it ?",
        default: false,
      },
    ])
    .then((answers) => {
      if (answers.existing) {
        buildAppName();
      } else {
        console.log("Goodbye 👋");
      }
    });
} else {
  buildAppName();
}
