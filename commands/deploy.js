const {
  cleanPath,
  readFile,
  zipper,
} = require('common-mods');

const {
  checkForProjectJson,
  extractAwsEnvData,
  getAllProjectFunctions,
  getProjectPrefix,
  initializeAWSservices,
} = require('../modules/modules');

const { functionsPath, tempFolder } = require('../config');

let lambda;

const updateFunctionCode = (FunctionName, zipBuffer) => new Promise(async (resolve, reject) => {
  const params = {
    FunctionName,
    Publish: true,
    ZipFile: zipBuffer, // <Binary String>
  };
  lambda.updateFunctionCode(params, (err, data) => {
    if (!err) {
      resolve(data);
    } else {
      reject(err);
    }
  });
});

const deploy = async (func, functionPrefix, env) => {
  try {
    const envCreds = await extractAwsEnvData(env);
    ({ lambda } = await initializeAWSservices(env, envCreds));

    const FunctionName = `${functionPrefix}_${func}`;
    // create zip from the folder
    const zipPath = await zipper(`${functionsPath}/${func}`, func, tempFolder);
    const zipBuffer = await readFile(zipPath);
    const updateRes = await updateFunctionCode(FunctionName, zipBuffer);
    const {
      Version,
      LastUpdateStatus,
    } = updateRes;
    console.log(` - ${FunctionName} update was ${LastUpdateStatus}. Version: ${Version}`);

    await cleanPath(tempFolder);

    return Promise.resolve();
  } catch (err) {
    console.log('[ERR][deploy] ', err);
    return Promise.reject(err);
  }
};

module.exports.deployHandler = async (lambdas, options) => {
  try {
    const {
      env = 'dev',
    } = options;

    const projectJsonPath = await checkForProjectJson(env);
    const functionPrefix = await getProjectPrefix(projectJsonPath);

    let invalidFunctions;
    const allProjectFunctions = await getAllProjectFunctions(functionsPath);

    if (lambdas && !lambdas.length) {
      // read all functins in {functionsPath}
      lambdas = allProjectFunctions;
    } else {
      invalidFunctions = lambdas.filter((l) => !allProjectFunctions.includes(l));
    }

    if (invalidFunctions && invalidFunctions.length) {
      console.log(' [ERR][invalidFunctions] Invalid functions detected: ', invalidFunctions);
    } else {
      lambdas.forEach((func) => {
        deploy(func, functionPrefix, env);
      });
    }
  } catch (err) {
    console.log(' [ERR][deployHandler] ', err.errMessage);
  }
};
