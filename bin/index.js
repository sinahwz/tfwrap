#!/usr/bin/env node
const { Command } = require('commander');
const { deployHandler } = require('../commands/deploy');
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

program.parse(process.argv);

// if (program.debug) console.log(program.opts());
