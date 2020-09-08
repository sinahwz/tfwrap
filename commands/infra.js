const iterator = require('batch-iterator');
const {
  commandExec,
  readDir,
  isDirectory,
} = require('common-mods');

const {
  extractAwsEnvData,
  initializeAWSservices,
  checkForProjectJson,
} = require('../modules/modules');

const { functionsPath, infraPath } = require('../config');

let lambda;
const functions = [];

const getFunctionInfo = async (content) => {
  try {
    if (isDirectory(`${functionsPath}/${content}`)) {
      const params = {
        FunctionName: `monarch_${content}`, /* required */
        // Qualifier: 'STRING_VALUE'
      };
      const data = await lambda.getFunction(params).promise();
      const { FunctionName, FunctionArn } = data.Configuration;
      functions.push({
        FunctionName,
        FunctionArn,
      });
    }
    return Promise.resolve();
  } catch (err) {
    console.log('[ERR][getFunctionInfo] ', err);
    return Promise.reject(err);
  }
};

module.exports.infraHandler = async (command, options) => {
  let response;
  try {
    const {
      env = 'dev',
    } = options;

    await checkForProjectJson(env);

    const envCreds = await extractAwsEnvData(env);
    ({ lambda } = await initializeAWSservices(env, envCreds));

    // prepare the env variabled
    const contents = await readDir(functionsPath);

    await iterator(contents, 10, getFunctionInfo);

    let terraformVariables = `-var apex_environment=${env}`;
    functions.forEach((func) => {
      const {
        FunctionName,
        FunctionArn,
      } = func;

      const apexVarName = FunctionName.replace('monarch', 'apex_function');
      terraformVariables = `${terraformVariables} -var ${apexVarName}=${FunctionArn} -var ${apexVarName}_name=${FunctionName}`;
    });

    let cmd;
    if (command) {
      process.chdir(`${infraPath}/${env}`);

      if (command === 'init') {
        cmd = 'terraform init';
      } else if (command === 'plan') {
        cmd = `terraform plan ${terraformVariables}`;
      } else if (command === 'apply') {
        cmd = `terraform apply ${terraformVariables} -auto-approve`;
      } else {
        cmd = 'terraform --help';
      }
    } else {
      cmd = 'terraform --help';
    }

    await commandExec(cmd, false, false);

    response = Promise.resolve();
  } catch (err) {
    // response = Promise.reject(err);
    response = Promise.resolve(err);
  }
  return response;
};
