const {
  cleanPath,
  readFile,
  zipper,
} = require('common-mods');

const {
  extractAwsEnvData,
  initializeAWSservices,
} = require('../modules/modules');

let lambda;
const availableEnvs = [
  'dev', 'test', 'qa',
];

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

const monarchFunctionsPath = './functions';

module.exports.deploy = async (func, env) => {
  try {
    if (env && availableEnvs.includes(env)) {
      const envCreds = await extractAwsEnvData(env);
      ({ lambda } = await initializeAWSservices(env, envCreds));

      const FunctionName = `monarch_${func}`;
      // create zip from the folder
      const zipPath = await zipper(`${monarchFunctionsPath}/${func}`, func, './tmp');
      const zipBuffer = await readFile(zipPath);
      const updateRes = await updateFunctionCode(FunctionName, zipBuffer);
      const {
        Version,
        LastUpdateStatus,
      } = updateRes;
      console.log(` - ${FunctionName} update was ${LastUpdateStatus}. Version: ${Version}`);

      await cleanPath('./tmp');
    }
    return Promise.resolve();
  } catch (err) {
    console.log('[ERR][run] ', err);
    return Promise.reject(err);
  }
};

// module.exports.deploy = async (env, lambda) => {
//   try {
//     const args = process.argv.slice(2);
//     const [env, ...functions] = args;
//     console.log(' :::: functions', functions);
//     if (env && availableEnvs.includes(env)) {
//       const envCreds = await extractAwsEnvData(env);
//       ({ lambda } = await initializeAWSservices(env, envCreds));

//       // eslint-disable-next-line no-restricted-syntax
//       for (const func of functions) {
//         if (functions.includes(func)) {
//           const FunctionName = `monarch_${functions}`;
//           // create zip from the folder
//           const zipPath = await zipper(`${monarchFunctionsPath}/${func}`, func, './tmp');
//           const zipBuffer = await readFile(zipPath);
//           await updateFunctionCode(FunctionName, zipBuffer);
//         } else {
//           console.log(' :::: FUNCTION INVALID', func);
//         }
//       }

//       await cleanPath('./tmp');
//     }
//     return Promise.resolve();
//   } catch (err) {
//     console.log('[ERR][run] ', err);
//     return Promise.reject(err);
//   }
// };
