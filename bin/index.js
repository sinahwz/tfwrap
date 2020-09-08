#!/usr/bin/env node
const { Command } = require('commander');
// const { commandExec } = require('common-mods');

const { deployHandler } = require('../commands/deploy');
const { infraHandler } = require('../commands/infra');
const { version } = require('../package.json');

const program = new Command();

program.version(version);

// Options
program
  .command('deploy [lambda...]')
  .option('-e, --env <env>', 'set the infra environment')
  .action(async (lambdas, options) => {
    await deployHandler(lambdas, options);
  });

program
  .command('infra [command]')
  .option('-e, --env <env>', 'set the infra environment')
  .action(async (command = '', options) => {
    await infraHandler(command, options);
  });

program.parse(process.argv);

// if (program.debug) console.log(program.opts());
