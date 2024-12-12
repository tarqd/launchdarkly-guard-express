import express from 'express'
// import launchdarkly
import * as LaunchDarkly from '@launchdarkly/node-server-sdk';
import {
    // Creates a SDK hook and a function to create middleware for express
    createGuard, 
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
    createMiddleware
} = createGuard();

const ldClient = LaunchDarkly.init(LD_SDK_KEY, {
    hooks: [expressHook]
});

const guardMiddleware = createMiddleware(ldClient);

const app = express()
const port = 8000
// Pre-middleware initializes the async storage data
// and tracks the request start time
app.use(guardMiddleware.pre);
app.get('/', (req, res, next) => {
  // any time you call ldClient.variation, the "last context" for _this request_ is stored
  // middleware will use that when tracking metrics
  // this is on a per-request basis, so two interleaved requests will not interfere with each other
  // we do this using asyncLocalStorage
  ldClient.variation('release-widget', req[LD_REQUEST_CONTEXT], false, (err, show) => {
    res.send(show ? 'Hello World!' : 'Not today!');
    next()
  });
  
})
app.get('/error', (req, res, next) => {
  
    ldClient.variation('release-widget', req[LD_REQUEST_CONTEXT], false, (err, show) => {
      res.send('we got an error!');
        next(new Error('Something went wrong'));
    });
    
})

// post middleware:
// - tracks the request duration
// - sets up an error handler to track errors
app.use(guardMiddleware.post);
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
