import { AsyncLocalStorage } from "async_hooks";
import { create } from "domain";
import { performance } from "perf_hooks";

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

    const preMiddleware = (req, res, next) => {
        // storage the last available context and start time in this request context
        // transform request into a request context
        const request_context_kind = 'x_ld_request';
        const metadata = {
            ldContext: null,
            requestContext: Object.assign(requestToLDContext(request_context_kind, req), {startTime: Date.now()}),
            startTime: performance.now()
        };
        req[LD_GUARD_META] = metadata;
        // helper you can use if you want a request context
        req[LD_REQUEST_CONTEXT] = metadata.requestContext;
        console.log(req[LD_GUARD_META]);
        store.run(metadata, next);
    }
 
    function createPostMiddleware(ldClient) {
        const getDuration = (req) => {
            const {startTime} = req[LD_GUARD_META];
            return performance.now() - startTime;
        };

        const trackDuration = (req, res, next) => {
            const context = req[LD_GUARD_META]?.lastLDContext;
            if (context) {
                const duration = getDuration(req);
                ldClient.track('request-duration-ms', context, duration);
            }
            next();
        };
        const trackErrors = (err, req, res, next) => {
            const context = req[LD_GUARD_META]?.lastLDContext;
            if (context) {
                const duration = getDuration(req);
                ldClient.track('request-duration-ms', context, duration);
                ldClient.track('error', context);
            }
            next(err);
        };
        return [trackDuration, trackErrors];
    }

    return {
        expressHook: sdkHook,
        createMiddleware(ldClient) {
            return {
                pre: [preMiddleware],
                post: createPostMiddleware(ldClient)
            }
        }
    }
}

