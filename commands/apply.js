const iterator = require('batch-iterator');
const {
  commandExec,
  readDir,
  isDirectory,
} = require('common-mods');

const {
  extractAwsEnvData,
  initializeAWSservices,
} = require('../modules/modules');


let lambda;
const functions = [];
const functionsPath = './functions';

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

const availableEnvs = [
  'dev', 'test', 'qa',
];

module.exports.apply = async () => {
  let response;
  try {
    const [env] = process.argv.slice(2);
    if (env && availableEnvs.includes(env)) {
      const envCreds = await extractAwsEnvData(env);
      ({ lambda } = await initializeAWSservices(env, envCreds));

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

      process.chdir(`./infrastructure/${env}`);
      console.log('     Running: terraform init');
      await commandExec('terraform init', false, false);
      console.log('     Running: terraform plan');
      await commandExec(`terraform plan ${terraformVariables}`, false, false);
      console.log('     Running: terraform apply');
      await commandExec(`terraform apply ${terraformVariables} -auto-approve`, false, false);
      response = Promise.resolve();
    } else {
      const err = {
        errMessage: 'Provide a valid environment please.',
      };
      response = Promise.reject(err);
    }
  } catch (err) {
    response = Promise.reject(err);
  }
  return response;
};
