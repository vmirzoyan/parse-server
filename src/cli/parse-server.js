require('@google-cloud/trace-agent').start({
  samplingRate: 20,
  bufferSize: 1,
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

/* eslint-disable no-console */
import ParseServer from '../index';
import definitions from './definitions/parse-server';
import cluster from 'cluster';
import os from 'os';
import runner from './utils/runner';

const help = function() {
  console.log('  Get Started guide:');
  console.log('');
  console.log('    Please have a look at the get started guide!');
  console.log('    http://docs.parseplatform.org/parse-server/guide/');
  console.log('');
  console.log('');
  console.log('  Usage with npm start');
  console.log('');
  console.log('    $ npm start -- path/to/config.json');
  console.log(
    '    $ npm start -- --appId APP_ID --masterKey MASTER_KEY --serverURL serverURL'
  );
  console.log(
    '    $ npm start -- --appId APP_ID --masterKey MASTER_KEY --serverURL serverURL'
  );
  console.log('');
  console.log('');
  console.log('  Usage:');
  console.log('');
  console.log('    $ parse-server path/to/config.json');
  console.log(
    '    $ parse-server -- --appId APP_ID --masterKey MASTER_KEY --serverURL serverURL'
  );
  console.log(
    '    $ parse-server -- --appId APP_ID --masterKey MASTER_KEY --serverURL serverURL'
  );
  console.log('');
};

runner({
  definitions,
  help,
  usage: '[options] <path/to/configuration.json>',
  start: function(program, options, logOptions) {

    // const push = {
    //   HubName: process.env.MS_NOTIFICATION_HUB_NAME,
    //   ConnectionString: process.env.MS_NOTIFICATION_HUB_CONNECTION_STRING
    // }; 
    // if(!push.HubName || !push.ConnectionString)
    //   console.error(`Missing Azure Push Adapter properties. Push Notifications will not work.`);
    // else {
    //   var AzurePushAdapter = require('parse-server-azure-push');
    //   options.push = { 
    //     adapter: AzurePushAdapter(push)
    //   }
    // }

    options.push = {
      android: {
        apiKey: process.env.FCM_API_KEY
      },
      ios: {
        pfx: process.env.APN_PUSH_CERT_FILE,
        passphrase: process.env.APN_PUSH_CERT_PASSPHRASE, // optional password to your p12/PFX
        bundleId: process.env.IOS_APP_BUNDLE_ID,
        production: false
      }
    }    
    
    if (!options.appId || !options.masterKey) {
      program.outputHelp();
      console.error('');
      console.error(
        '\u001b[31mERROR: appId and masterKey are required\u001b[0m'
      );
      console.error('');
      process.exit(1);
    }

    if (options['liveQuery.classNames']) {
      options.liveQuery = options.liveQuery || {};
      options.liveQuery.classNames = options['liveQuery.classNames'];
      delete options['liveQuery.classNames'];
    }
    if (options['liveQuery.redisURL']) {
      options.liveQuery = options.liveQuery || {};
      options.liveQuery.redisURL = options['liveQuery.redisURL'];
      delete options['liveQuery.redisURL'];
    }
    if (options['liveQuery.redisOptions']) {
      options.liveQuery = options.liveQuery || {};
      options.liveQuery.redisOptions = options['liveQuery.redisOptions'];
      delete options['liveQuery.redisOptions'];
    }

    if (options.cluster) {
      const numCPUs =
        typeof options.cluster === 'number'
          ? options.cluster
          : os.cpus().length;
      if (cluster.isMaster) {
        logOptions();
        for (let i = 0; i < numCPUs; i++) {
          cluster.fork();
        }
        cluster.on('exit', (worker, code) => {
          console.log(
            `worker ${worker.process.pid} died (${code})... Restarting`
          );
          cluster.fork();
        });
      } else {
        ParseServer.start(options, () => {
          printSuccessMessage();
        });
      }
    } else {
      ParseServer.start(options, () => {
        logOptions();
        console.log('');
        printSuccessMessage();
      });
    }

    function printSuccessMessage() {
      console.log(
        '[' + process.pid + '] parse-server running on ' + options.serverURL
      );
      if (options.mountGraphQL) {
        console.log(
          '[' +
            process.pid +
            '] GraphQL running on http://localhost:' +
            options.port +
            options.graphQLPath
        );
      }
      if (options.mountPlayground) {
        console.log(
          '[' +
            process.pid +
            '] Playground running on http://localhost:' +
            options.port +
            options.playgroundPath
        );
      }
    }
  },
});

/* eslint-enable no-console */
