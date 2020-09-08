const AWS = require('aws-sdk');
const homeDir = require('os').homedir();

const {
  commandExec,
  pathExists,
  readDir,
  isDirectory,
  readJson,
} = require('common-mods');

const checkForProjectJson = async (env) => {
  try {
    let response;
    const envString = env === 'dev' ? '' : `${env}.`;

    const projectJsonPath = `./project.${envString}json`;
    if (pathExists(projectJsonPath)) {
      response = Promise.resolve(projectJsonPath);
    } else {
      const err = {
        errMessage: 'Could not find the corresponding project.json',
      };
      response = Promise.reject(err);
    }

    return response;
  } catch (err) {
    console.log('[ERR][checkForProjectJson] ', err);
    return Promise.reject(err);
  }
};

const getRegion = async (env) => {
  try {
    let response;
    const region = await commandExec(`aws configure get profile.${env}.region`, true, false);

    if (region && region.length === 0) {
      const err = {
        errMessage: `No REGION found for (${env})`,
      };
      response = Promise.reject(err);
    } else {
      response = Promise.resolve(region.replace(/(\r\n|\n|\r)/gm, ''));
    }

    return response;
  } catch (err) {
    console.log('[ERR][getRegion] ', err);
    return Promise.reject(err);
  }
};

const getCreds = async (env) => {
  try {
    let response;
    let accessKeyId = '';
    let secretAccessKey = '';
    accessKeyId = await commandExec(`aws configure get profile.${env}.aws_access_key_id`, true, false);
    secretAccessKey = await commandExec(`aws configure get profile.${env}.aws_secret_access_key`, true, false);

    if ((accessKeyId.length === 0) || (secretAccessKey.length === 0)) {
      const err = {
        errMessage: `No CREDENTIALS found for (${env})`,
      };
      response = Promise.reject(err);
    } else {
      response = Promise.resolve({
        accessKeyId: accessKeyId.replace(/(\r\n|\n|\r)/gm, ''),
        secretAccessKey: secretAccessKey.replace(/(\r\n|\n|\r)/gm, ''),
      });
    }

    return response;
  } catch (err) {
    console.log('[ERR][getCreds] ', err);
    return Promise.reject(err);
  }
};

const extractAwsEnvData = async (env) => {
  try {
    const awsCredsPath = `${homeDir}/.aws`;
    let response = null;
    if (pathExists(awsCredsPath)) {
      const region = await getRegion(env);
      const { accessKeyId, secretAccessKey } = await getCreds(env);

      response = Promise.resolve({
        accessKeyId,
        secretAccessKey,
        region,
      });
    } else {
      const err = {
        errMessage: 'No .aws creds/config folder.',
      };
      response = Promise.reject(err);
    }

    return response;
  } catch (err) {
    console.log('[ERR][extractAwsEnvData] ', err);
    return Promise.reject(err);
  }
};

const initializeAWSservices = async (env, envCreds) => {
  try {
    const {
      accessKeyId,
      secretAccessKey,
      region,
    } = envCreds;

    const configData = new AWS.Config({
      accessKeyId,
      secretAccessKey,
      region,
    });

    const lambda = new AWS.Lambda(configData);

    return Promise.resolve({
      lambda,
    });
  } catch (err) {
    console.log('[ERR][initializeAWSservices] ', err);
    return Promise.reject(err);
  }
};

const getAllProjectFunctions = async (functionsPath) => {
  try {
    const contents = await readDir(functionsPath);
    const lambdas = contents.filter((content) => isDirectory(`${functionsPath}/${content}`));

    return Promise.resolve(lambdas);
  } catch (err) {
    console.log('[ERR][getAllProjectFunctions] ', err);
    return Promise.reject(err);
  }
};

const getProjectPrefix = async (env) => {
  try {
    const projectJsonPath = await checkForProjectJson(env);
    const { name: functionPrefix } = readJson(projectJsonPath);

    return Promise.resolve(functionPrefix);
  } catch (err) {
    console.log('[ERR][getProjectPrefix] ', err);
    return Promise.reject(err);
  }
};

module.exports = {
  getRegion,
  getCreds,
  extractAwsEnvData,
  initializeAWSservices,
  checkForProjectJson,
  getAllProjectFunctions,
  getProjectPrefix,
};
