Steps to reproduce:

1. npm i
2. npm run dev:turbo
3. Try to open localhost:3000

What is wrong? First of all the app crashes, while it likely shouldn't. Dev mode without turbopack runs fine.

The crash likely looks something like:

```
> dev:turbo
> next dev --turbo

  ▲ Next.js 14.2.0-canary.54 (turbo)
  - Local:        http://localhost:3000
  - Experiments (use with caution):
    · instrumentationHook

 ✓ Starting...
TypeError: An error occurred while loading instrumentation hook: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$opentelemetry$2f$instrumentation$2f$node_modules$2f$import$2d$in$2d$the$2d$middle$2f$index$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ is not a constructor
    at _loop_1 (/tmp/reproduction-app/.next/server/chunks/node_modules_606038._.js:5783:27)
    at InstrumentationBase.enable (/tmp/reproduction-app/.next/server/chunks/node_modules_606038._.js:5794:17)
    at new InstrumentationBase (/tmp/reproduction-app/.next/server/chunks/node_modules_606038._.js:5640:19)
    at new MyInstrumentation (/tmp/reproduction-app/.next/server/chunks/instrumentation_ts_ca8ae5._.js:21:9)
    at Module.register (/tmp/reproduction-app/.next/server/chunks/instrumentation_ts_ca8ae5._.js:16:31)
    at DevServer.runInstrumentationHookIfAvailable (/tmp/reproduction-app/node_modules/next/dist/server/dev/next-dev-server.js:437:43)
    at async Span.traceAsyncFn (/tmp/reproduction-app/node_modules/next/dist/trace/trace.js:154:20)
    at async DevServer.prepareImpl (/tmp/reproduction-app/node_modules/next/dist/server/dev/next-dev-server.js:214:9)
    at async NextServer.prepare (/tmp/reproduction-app/node_modules/next/dist/server/next.js:161:13)
    at async initializeImpl (/tmp/reproduction-app/node_modules/next/dist/server/lib/render-server.js:98:5)
    at async initialize (/tmp/reproduction-app/node_modules/next/dist/server/lib/router-server.js:423:22)
    at async Server.<anonymous> (/tmp/reproduction-app/node_modules/next/dist/server/lib/start-server.js:249:36)
```

If we take a look at the code of the top frame "/tmp/reproduction-app/.next/server/chunks/node*modules_606038.*.js:5783:27" we end up at a location that looks as follows:

```ts
// `RequireInTheMiddleSingleton` does not support absolute paths.
// For an absolute paths, we must create a separate instance of the
// require-in-the-middle `Hook`.
var hook = __TURBOPACK__commonjs__external__path__.isAbsolute(module_2.name) ? new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$require$2d$in$2d$the$2d$middle$2f$index$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["Hook"]([
    module_2.name
], {
    internals: true
}, onRequire) : this_1._requireInTheMiddleSingleton.register(module_2.name, onRequire);
this_1._hooks.push(hook);
var esmHook = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$opentelemetry$2f$instrumentation$2f$node_modules$2f$import$2d$in$2d$the$2d$middle$2f$index$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__([
    module_2.name
], {
    internals: false
}, hookFn);
this_1._hooks.push(esmHook);
```

Searching for the comment on top code on github (https://github.com/search?type=code&q=%22%2F%2F+%60RequireInTheMiddleSingleton%60+does+not+support+absolute+paths.%22) lets us deduct that it comes from here: https://github.com/open-telemetry/opentelemetry-js/blob/e01f493a2480bda39f9ee67da1c33f31a57f91ff/experimental/packages/opentelemetry-instrumentation/src/platform/node/instrumentation.ts#L262.

It seems like the `new Hook()` call fails because it is not a class. Weird.

If we look at the cryptic variable name `__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$opentelemetry$2f$instrumentation$2f$node_modules$2f$import$2d$in$2d$the$2d$middle$2f$index$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__` it looks like it is trying to import from `import-in-the-middle`, HOWEVER, the original source is importing `Hook` from `require-in-the-middle`: https://github.com/open-telemetry/opentelemetry-js/blob/e01f493a2480bda39f9ee67da1c33f31a57f91ff/experimental/packages/opentelemetry-instrumentation/src/platform/node/instrumentation.ts#L32 (here's the packaged code https://unpkg.com/browse/@opentelemetry/instrumentation@0.48.0/build/esm/platform/node/instrumentation.js)

I couldn't find any place where Next.js or turbopack would change how `require-in-the-middle` is resolved so this is where I am stomped. As far as I am concerned all the libraries are not doing anything fishy.