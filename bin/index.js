#!/usr/bin/env node
const { Command } = require('commander');
const { checkForProjectJson } = require('../modules/modules');
const { deploy } = require('../commands/deploy');
const { version } = require('../package.json');

const program = new Command();

program.version(version);

// Options
program
  .command('deploy [lambda...]')
  .option('-e, --env <env>', 'set the infra environment')
  .action(async (lambdas, options) => {
    try {
      const {
        env = 'dev',
      } = options;

      await checkForProjectJson(env);

      if (lambdas) {
        lambdas.forEach((lambda) => {
          deploy(lambda, env);
        });
      } else {
        // read the /functions folder
      }
    } catch (err) {
      console.log(' [ERR] ', err.errMessage);
    }
  });

program.parse(process.argv);

// if (program.debug) console.log(program.opts());

// console.log('pizza details:');
// if (program.env) console.log('- small pizza size');
