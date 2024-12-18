import express from 'express'
// import launchdarkly
import * as LaunchDarkly from '@launchdarkly/node-server-sdk';
import {
    // Creates a SDK hook and a function to create middleware for express
    createGuard, 
    // Handles error tracking, must added after all other middleware
    guardErrorHandler,
    // Symbol that let's you access the automatic request context
    // Just a helper for generating a context with a random uuid and some request information
    // This is optional, you can create your own context
    LD_REQUEST_CONTEXT
} from './guard.js';

const LD_SDK_KEY = process.env.LD_SDK_KEY;
const {
    // LaunchDarkly SDK hook that registers context tracking
    expressHook, 
    // Creates the middleware for the given SDK client instance
    guardMiddleware
} = createGuard();

const ldClient = LaunchDarkly.init(LD_SDK_KEY, {
    hooks: [expressHook]
});


const app = express()
const port = 8000
// Pre-middleware initializes the async storage data
// and tracks the request start time
app.use(guardMiddleware(ldClient));
app.get('/', (req, res, next) => {
  // any time you call ldClient.variation, the "last context" for _this request_ is stored
  // middleware will use that when tracking metrics
  // this is on a per-request basis, so two interleaved requests will not interfere with each other
  // we do this using asyncLocalStorage
  ldClient.variation('release-widget', req[LD_REQUEST_CONTEXT], false, (err, show) => {
    res.send(show ? 'Hello World!' : 'Not today!');
  });
  
})
app.get('/error', (req, res, next) => {
  
    ldClient.variation('release-widget', req[LD_REQUEST_CONTEXT], false, (err, show) => {
      //res.send('we got an error!');
        next(new Error('we got an error!'));
    });
    
})

app.use(guardErrorHandler());


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

process.on('beforeExit', async () => {
    await ldClient.flush();
});
