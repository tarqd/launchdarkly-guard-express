import { AsyncLocalStorage } from "async_hooks";
import { performance } from "perf_hooks";
import onHeaders from 'on-headers';



class LaunchDarklyExpressHook {
    constructor(store) {
        this.storage = store;
    }
    getMetadata() {
        return {name: "Express.JS Automatic Request/Error Tracking"};
    }
    afterEvaluation({context}, data, _detail) {
        const store = this.storage.getStore();
        if(store) {
            store.lastLDContext = context;
        }
        return data
    }
}

export const LD_GUARD_META = Symbol('LD_GUARD_META');
export const LD_REQUEST_CONTEXT = Symbol('LD_REQUEST_CONTEXT');
export const LD_CLIENT = Symbol('LD_CLIENT');

function randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function requestToLDContext(kind, req) {
    return {
        kind,
        key: randomUUID(),
        anonymous: true,
        route: req.route?.path,
        method: req.method,
        baseUrl: req.baseUrl,
        ipAddress: req.ip,
        hostname: req.hostname
    }
}

export function createGuard() {
    const store = new AsyncLocalStorage();
    const sdkHook = new LaunchDarklyExpressHook(store);
    
    function guardMiddleware(ldClient) {
        return (req, res, next) => {
            const startTime = performance.now();
            const request_context_kind = 'x_ld_request';
            const metadata = {
                lastLDContext: null,
                startTime,
            };
            req[LD_GUARD_META] = metadata;
            req[LD_CLIENT] = ldClient;
            // helper you can use if you want a request context
            req[LD_REQUEST_CONTEXT] = Object.assign(
                requestToLDContext(request_context_kind, req),
                { startTime: Math.floor(startTime) }
            );
            
            // we use the res middleware to track the end of the request
            onHeaders(res, function responseTime(){
                const duration = performance.now() - startTime;
                const context = req[LD_GUARD_META]?.lastLDContext;
                if (context) {
                    ldClient.track('response-time-ms', context, duration);
                }
            });
            store.run(metadata, next);
        };
    }

 
   

    return {
        expressHook: sdkHook,
        guardMiddleware,
    }
}

export function guardErrorHandler() {
    return (err, req, res, next) => {
        const ldClient = req[LD_CLIENT];
        const context = req[LD_GUARD_META]?.lastLDContext;
        if (!ldClient) {
            console.warn("No LaunchDarkly client found on request object. Did you forget to add the guard middleware?");
            return next(err);
        }
        if (context) {
            ldClient.track('error', context, err);
        } else {
            console.warn("No LaunchDarkly context found on request object while handling error");
        }
        next(err);
    }
}

