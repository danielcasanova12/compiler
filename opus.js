// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == 'object';
var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != 'undefined';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == 'object' && typeof process.versions == 'object' && typeof process.versions.node == 'string' && process.type != 'renderer';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // `require()` is no-op in an ESM module, use `createRequire()` to construct
  // the require()` function.  This is only necessary for multi-environment
  // builds, `-sENVIRONMENT=node` emits a static import declaration instead.
  // TODO: Swap all `require()`'s with `import()`'s?

}

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
  if (typeof process == 'undefined' || !process.release || process.release.name !== 'node') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  var nodeVersion = process.versions.node;
  var numericVersion = nodeVersion.split('.').slice(0, 3);
  numericVersion = (numericVersion[0] * 10000) + (numericVersion[1] * 100) + (numericVersion[2].split('-')[0] * 1);
  var minVersion = 160000;
  if (numericVersion < 160000) {
    throw new Error('This emscripten-generated code requires node v16.0.0 (detected v' + nodeVersion + ')');
  }

  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('fs');
  var nodePath = require('path');

  scriptDirectory = __dirname + '/';

// include: node_shell_read.js
readBinary = (filename) => {
  // We need to re-wrap `file://` strings to URLs. Normalizing isn't
  // necessary in that case, the path should already be absolute.
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  var ret = fs.readFileSync(filename);
  assert(ret.buffer);
  return ret;
};

readAsync = (filename, binary = true) => {
  // See the comment in the `readBinary` function.
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  return new Promise((resolve, reject) => {
    fs.readFile(filename, binary ? undefined : 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(binary ? data.buffer : data);
    });
  });
};
// end include: node_shell_read.js
  if (!Module['thisProgram'] && process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  arguments_ = process.argv.slice(2);

  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

} else
if (ENVIRONMENT_IS_SHELL) {

  if ((typeof process == 'object' && typeof require === 'function') || typeof window == 'object' || typeof WorkerGlobalScope != 'undefined') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != 'undefined' && document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.startsWith('blob:')) {
    scriptDirectory = '';
  } else {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/')+1);
  }

  if (!(typeof window == 'object' || typeof WorkerGlobalScope != 'undefined')) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  {
// include: web_or_worker_shell_read.js
if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = (url) => {
    // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
    // See https://github.com/github/fetch/pull/92#issuecomment-140665932
    // Cordova or Electron apps are typically loaded from a file:// url.
    // So use XHR on webview if URL is a file URL.
    if (isFileURI(url)) {
      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            resolve(xhr.response);
            return;
          }
          reject(xhr.status);
        };
        xhr.onerror = reject;
        xhr.send(null);
      });
    }
    return fetch(url, { credentials: 'same-origin' })
      .then((response) => {
        if (response.ok) {
          return response.arrayBuffer();
        }
        return Promise.reject(new Error(response.status + ' : ' + response.url));
      })
  };
// end include: web_or_worker_shell_read.js
  }
} else
{
  throw new Error('environment detection error');
}

var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.error.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used.
moduleOverrides = null;
checkIncomingModuleAPI();

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (Module['arguments']) arguments_ = Module['arguments'];legacyModuleProp('arguments', 'arguments_');

if (Module['thisProgram']) thisProgram = Module['thisProgram'];legacyModuleProp('thisProgram', 'thisProgram');

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// Assertions on removed incoming Module JS APIs.
assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['read'] == 'undefined', 'Module.read option was removed');
assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)');
assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
legacyModuleProp('asm', 'wasmExports');
legacyModuleProp('readAsync', 'readAsync');
legacyModuleProp('readBinary', 'readBinary');
legacyModuleProp('setWindowTitle', 'setWindowTitle');
var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
var ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
var JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
var OPFS = 'OPFS is no longer included by default; build with -lopfs.js';

var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

assert(!ENVIRONMENT_IS_SHELL, 'shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.');

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary = Module['wasmBinary'];legacyModuleProp('wasmBinary', 'wasmBinary');

if (typeof WebAssembly != 'object') {
  err('no native wasm support detected');
}

// include: base64Utils.js
// Converts a string of base64 into a byte array (Uint8Array).
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE != 'undefined' && ENVIRONMENT_IS_NODE) {
    var buf = Buffer.from(s, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }

  var decoded = atob(s);
  var bytes = new Uint8Array(decoded.length);
  for (var i = 0 ; i < decoded.length ; ++i) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}
// end include: base64Utils.js
// Wasm globals

var wasmMemory;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.
function _malloc() {
  abort('malloc() called but not included in the build - add `_malloc` to EXPORTED_FUNCTIONS');
}
function _free() {
  // Show a helpful error since we used to include free by default in the past.
  abort('free() called but not included in the build - add `_free` to EXPORTED_FUNCTIONS');
}

// Memory management

var HEAP,
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

// include: runtime_shared.js
function updateMemoryViews() {
  var b = wasmMemory.buffer;
  Module['HEAP8'] = HEAP8 = new Int8Array(b);
  Module['HEAP16'] = HEAP16 = new Int16Array(b);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(b);
  Module['HEAP32'] = HEAP32 = new Int32Array(b);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(b);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(b);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(b);
}

// end include: runtime_shared.js
assert(!Module['STACK_SIZE'], 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')

assert(typeof Int32Array != 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined,
       'JS engine does not provide full typed array support');

// If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
assert(!Module['wasmMemory'], 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally');
assert(!Module['INITIAL_MEMORY'], 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically');

// include: runtime_stack_check.js
// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with SAFE_HEAP and ASAN which also
  // monitor writes to address zero.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max)>>2)] = 0x02135467;
  HEAPU32[(((max)+(4))>>2)] = 0x89BACDFE;
  // Also test the global address 0 for integrity.
  HEAPU32[((0)>>2)] = 1668509029;
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var cookie1 = HEAPU32[((max)>>2)];
  var cookie2 = HEAPU32[(((max)+(4))>>2)];
  if (cookie1 != 0x02135467 || cookie2 != 0x89BACDFE) {
    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[((0)>>2)] != 0x63736d65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }
}
// end include: runtime_stack_check.js
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;

function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  checkStackCookie();

  
if (!Module['noFSInit'] && !FS.initialized)
  FS.init();
FS.ignorePermissions = false;

TTY.init();
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  checkStackCookie();
  
  callRuntimeCallbacks(__ATMAIN__);
}

function postRun() {
  checkStackCookie();

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// include: runtime_math.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

assert(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
}

function addRunDependency(id) {
  runDependencies++;

  Module['monitorRunDependencies']?.(runDependencies);

  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval != 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(() => {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err('still waiting on run dependencies:');
          }
          err(`dependency: ${dep}`);
        }
        if (shown) {
          err('(end of list)');
        }
      }, 10000);
    }
  } else {
    err('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;

  Module['monitorRunDependencies']?.(runDependencies);

  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort(what) {
  Module['onAbort']?.(what);

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// include: URIUtils.js
// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */
var isDataURI = (filename) => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');
// end include: URIUtils.js
function createExportWrapper(name, nargs) {
  return (...args) => {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
    var f = wasmExports[name];
    assert(f, `exported native function \`${name}\` not found`);
    // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
    assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
    return f(...args);
  };
}

// include: runtime_exceptions.js
// end include: runtime_exceptions.js
function findWasmBinary() {
    var f = 'data:application/octet-stream;base64,AGFzbQEAAAABpAEYYAF/AX9gAn9/AX9gA39/fwF/YAF/AGAAAX9gBH9/f38Bf2ACf38AYAN/f38AYAAAYAN/fn8BfmAFf39/f38Bf2AGf3x/f39/AX9gAn5/AX9gBH9+fn8AYAZ/f39/f38Bf2ACfH8BfGAHf39/f39/fwF/YAR/f39/AGADfn9/AX9gBX9/f39/AGABfAF+YAJ+fgF8YAR/f35/AX5gBH9+f38BfwK3AgsDZW52BGV4aXQAAwNlbnYVX2Vtc2NyaXB0ZW5fbWVtY3B5X2pzAAcDZW52EF9fc3lzY2FsbF9vcGVuYXQABQNlbnYRX19zeXNjYWxsX2ZjbnRsNjQAAgNlbnYPX19zeXNjYWxsX2lvY3RsAAIWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQhmZF93cml0ZQAFFndhc2lfc25hcHNob3RfcHJldmlldzEHZmRfcmVhZAAFFndhc2lfc25hcHNob3RfcHJldmlldzEIZmRfY2xvc2UAABZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxDWZkX2Zkc3RhdF9nZXQAAQNlbnYWZW1zY3JpcHRlbl9yZXNpemVfaGVhcAAAFndhc2lfc25hcHNob3RfcHJldmlldzEHZmRfc2VlawAKA5wBmgEIAQYGAQIECAEIAQQABAQDAwABBgMBBQUKDgQGBwcABwMABwACAwMGBgQAAwMCAgAAAAkCAgAAAQECAAUAAgUAAAAAAAADAAEDAwkECAABAQEBAAADAwEEBAQIBQIACQEBAQEBAQABAAABAgEADwoQBwAREgwMEwILBhQFAgIAAgEAAgMBAQYBBAANDRUDBAgEBAQAAwAEFgoXBAUBcAELCwUHAQGCAoCAAgYXBH8BQYCABAt/AUEAC38BQQALfwFBAAsHuQIOBm1lbW9yeQIAEV9fd2FzbV9jYWxsX2N0b3JzAAsZX19pbmRpcmVjdF9mdW5jdGlvbl90YWJsZQEAEF9fbWFpbl9hcmdjX2FyZ3YAIAZmZmx1c2gAngEIc3RyZXJyb3IAchVlbXNjcmlwdGVuX3N0YWNrX2luaXQAmgEZZW1zY3JpcHRlbl9zdGFja19nZXRfZnJlZQCbARllbXNjcmlwdGVuX3N0YWNrX2dldF9iYXNlAJwBGGVtc2NyaXB0ZW5fc3RhY2tfZ2V0X2VuZACd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IY8HIAIgjwdqIZAHIJAHII0HaiGRByCRBykDACGCESCOByCCETcCAEEIIZIHIIYHIJIHaiGTB0HwASGUByACIJQHaiGVByCVByCSB2ohlgcglgcpAwAhgxEgkwcggxE3AgAgAigC7AEhlwcgAiCXBzYC6AEgAigC6AEhmAcgAiCYBzYCwAUMQwsgAigC2AUhmQdBdCGaByCZByCaB2ohmwcgmwcoAgAhnAcgAiCcBzYCwAUMQgsgAigC2AUhnQcgnQcoAgAhngcgAiCeBzYCwAUMQQtBACGfByACIJ8HNgLABQxACyACKALYBSGgB0F0IaEHIKAHIKEHaiGiByCiBygCACGjByCjBygCBCGkByACKALYBSGlB0F0IaYHIKUHIKYHaiGnByCnBygCACGoByCoBygCCCGpByACKALYBSGqB0F0IasHIKoHIKsHaiGsByCsBygCACGtByACKALYBSGuByCuBygCACGvB0EhIbAHILAHIKQHIKkHIK0HIK8HECMhsQcgAiCxBzYCwAUMPwsgAigC2AUhsgcgsgcoAgAhswcgAiCzBzYCwAUMPgsgAigC2AUhtAdBdCG1ByC0ByC1B2ohtgcgtgcoAgAhtwcgAiC3BzYCwAUMPQsgAigC2AUhuAdBaCG5ByC4ByC5B2ohugcgugcoAgAhuwcguwcoAgAhvAdBICG9ByC8ByC9B0YhvgdBASG/ByC+ByC/B3EhwAcCQAJAIMAHRQ0AIAIoAtgFIcEHIMEHKAIAIcIHIAIgwgc2AsAFDAELIAIoAtgFIcMHQWghxAcgwwcgxAdqIcUHIMUHKAIAIcYHIMYHKAIAIccHQSEhyAcgxwcgyAdGIckHQQEhygcgyQcgygdxIcsHAkACQCDLB0UNACACKALYBSHMB0F0Ic0HIMwHIM0HaiHOByDOBygCACHPByACKALYBSHQB0F0IdEHINAHINEHaiHSByDSBygCBCHTByACKALYBSHUB0FoIdUHINQHINUHaiHWByDWBygCACHXByDXBygCDCHYByACKALYBSHZB0FoIdoHINkHINoHaiHbByDbBygCACHcB0EhId0HIN0HIM8HINMHINgHINwHECMh3gcgAiDeBzYCwAUgAigC2AUh3wdBaCHgByDfByDgB2oh4Qcg4QcoAgAh4gdBDCHjByDiByDjB2oh5AcgAigC2AUh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C14BAn8CQCAAQcwAaiIBEE5FDQAgABA1GgsCQAJAIAAoAgQiAiAAKAIIRg0AIAAgAkEBajYCBCACLQAAIQAMAQsgABBKIQALAkAgARBPQYCAgIAEcUUNACABEFALIAALGwEBfyAAIAAoAgAiAUH/////AyABGzYCACABCxQBAX8gACgCACEBIABBADYCACABCwkAIABBARBSGgtGAQJ/IwBBIGsiASQAAkACQCAAIAFBCGoQCCIADQBBOyEAQQEhAiABLQAIQQJGDQELEDQgADYCAEEAIQILIAFBIGokACACCwQAQQALAgALAgALOQEBfyMAQRBrIgMkACAAIAEgAkH/AXEgA0EIahCkARCJASECIAMpAwghASADQRBqJABCfyABIAIbCwwAQcjUBBBTQczUBAsIAEHI1AQQVAssAQJ/IAAQViIBKAIAIgI2AjgCQCACRQ0AIAIgADYCNAsgASAANgIAEFcgAAubAQEDfyMAQRBrIgIkACACIAE6AA8CQAJAIAAoAhAiAw0AAkAgABBHRQ0AQX8hAwwCCyAAKAIQIQMLAkAgACgCFCIEIANGDQAgACgCUCABQf8BcSIDRg0AIAAgBEEBajYCFCAEIAE6AAAMAQsCQCAAIAJBD2pBASAAKAIkEQIAQQFGDQBBfyEDDAELIAItAA8hAwsgAkEQaiQAIAMLCAAgACABEFsLbwECfwJAAkAgASgCTCICQQBIDQAgAkUNASACQf////8DcRBkKAIYRw0BCwJAIABB/wFxIgIgASgCUEYNACABKAIUIgMgASgCEEYNACABIANBAWo2AhQgAyAAOgAAIAIPCyABIAIQWQ8LIAAgARBcC3ABA38CQCABQcwAaiICEF1FDQAgARA1GgsCQAJAIABB/wFxIgMgASgCUEYNACABKAIUIgQgASgCEEYNACABIARBAWo2AhQgBCAAOgAADAELIAEgAxBZIQMLAkAgAhBeQYCAgIAEcUUNACACEF8LIAMLGwEBfyAAIAAoAgAiAUH/////AyABGzYCACABCxQBAX8gACgCACEBIABBADYCACABCwkAIABBARBSGguoAQEEfxA0KAIAEHIhAQJAAkBBACgCpNAEQQBODQBBASECDAELQdjPBBA1RSECC0EAKAKg0AQhA0EAKALg0AQhBAJAIABFDQAgAC0AAEUNACAAIAAQc0EB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IAFB/////wdzSxshBAsgACACQQFqIgM2AgAgAiwAASEFIAQhASADIQIgBUFQaiIDQQpJDQALIAQLtgQAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgAUF3ag4SAAECBQMEBgcICQoLDA0ODxAREgsgAiACKAIAIgFBBGo2AgAgACABKAIANgIADwsgAiACKAIAIgFBBGo2AgAgACABNAIANwMADwsgAiACKAIAIgFBBGo2AgAgACABNQIANwMADwsgAiACKAIAIgFBBGo2AgAgACABNAIANwMADwsgAiACKAIAIgFBBGo2AgAgACABNQIANwMADwsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKQMANwMADwsgAiACKAIAIgFBBGo2AgAgACABMgEANwMADwsgAiACKAIAIgFBBGo2AgAgACABMwEANwMADwsgAiACKAIAIgFBBGo2AgAgACABMAAANwMADwsgAiACKAIAIgFBBGo2AgAgACABMQAANwMADwsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKQMANwMADwsgAiACKAIAIgFBBGo2AgAgACABNQIANwMADwsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKQMANwMADwsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKQMANwMADwsgAiACKAIAIgFBBGo2AgAgACABNAIANwMADwsgAiACKAIAIgFBBGo2AgAgACABNQIANwMADwsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKwMAOQMADwsgACACIAMRBgALCz4BAX8CQCAAUA0AA0AgAUF/aiIBIACnQQ9xQcDPBGotAAAgAnI6AAAgAEIPViEDIABCBIghACADDQALCyABCzYBAX8CQCAAUA0AA0AgAUF/aiIBIACnQQdxQTByOgAAIABCB1YhAiAAQgOIIQAgAg0ACwsgAQuKAQIBfgN/AkACQCAAQoCAgIAQWg0AIAAhAgwBCwNAIAFBf2oiASAAIABCCoAiAkIKfn2nQTByOgAAIABC/////58BViEDIAIhACADDQALCwJAIAJQDQAgAqchAwNAIAFBf2oiASADIANBCm4iBEEKbGtBMHI6AAAgA0EJSyEFIAQhAyAFDQALCyABC2wBAX8jAEGAAmsiBSQAAkAg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ACEFA0AgBSIEKAIEQXhxIAFGDQIgA0EddiEFIANBAXQhAyAEIAVBBHFqQRBqIgIoAgAiBQ0ACyACIAA2AgAgACAENgIYCyAAIAA2AgwgACAANgIIDwsgBCgCCCIBIAA2AgwgBCAANgIIIABBADYCGCAAIAQ2AgwgACABNgIICwtkAgF/AX4CQAJAIAANAEEAIQIMAQsgAK0gAa1+IgOnIQIgASAAckGAgARJDQBBfyACIANCIIinQQBHGyECCwJAIAIQjAEiAEUNACAAQXxqLQAAQQNxRQ0AIABBACACEDkaCyAACwcAPwBBEHQLUgECf0EAKAKU0wQiASAAQQdqQXhxIgJqIQACQAJAAkAgAkUNACAAIAFNDQELIAAQkwFNDQEgABAJDQELEDRBMDYCAEF/DwtBACAANgKU0wQgAQtTAQF+AkACQCADQcAAcUUNACABIANBQGqthiECQgAhAQwBCyADRQ0AIAFBwAAgA2utiCACIAOtIgSGhCECIAEgBIYhAQsgACABNwMAIAAgAjcDCAtTAQF+AkACQCADQcAAcUUNACACIANBQGqtiCEBQgAhAgwBCyADRQ0AIAJBwAAgA2uthiABIAOtIgSIhCEBIAIgBIghAgsgACABNwMAIAAgAjcDCAuQBAIFfwJ+IwBBIGsiAiQAIAFC////////P4MhBwJAAkAgAUIwiEL//wGDIginIgNB/4d/akH9D0sNACAAQjyIIAdCBIaEIQcgA0GAiH9qrSEIAkACQCAAQv//////////D4MiAEKBgICAgICAgAhUDQAgB0IBfCEHDAELIABCgICAgICAgIAIUg0AIAdCAYMgB3whBwtCACAHIAdC/////////wdWIgMbIQAgA60gCHwhBwwBCwJAIAAgB4RQDQAgCEL//wFSDQAgAEI8iCAHQgSGhEKAgICAgICABIQhAEL/DyEHDAELAkAgA0H+hwFNDQBC/w8hB0IAIQAMAQsCQEGA+ABBgfgAIAhQIgQbIgUgA2siBkHwAEwNAEIAIQBCACEHDAELIAJBEGogACAHIAdCgICAgICAwACEIAQbIgdBgAEgBmsQlQEgAiAAIAcgBhCWASACKQMAIgdCPIggAkEIaikDAEIEhoQhAAJAAkAgB0L//////////w+DIAUgA0cgAikDECACQRBqQQhqKQMAhEIAUnGthCIH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AIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhAAAAAAAAAAAABcBLAEsASwBAAEAACwBLAFKACwBLAEsASwBLAEsASwBLAFLACwBLAH/AP4A/QATADcANQA6AD0APwBCAEUALAEsASwBLAEeACUAwwAsAWcAWQAsAecAxQCuAF4ALAEsASwBKgAxAEgAMwBSAGIAXABOAF8AZQBuAGcAXQBoAFcALAGrAKIAjgB0AHkAfAB/AI4AdgCQAJIAlgAsASwBLAEsASwBLAGrAMUAhwCBAKkAqwCiAIYAnQCJAMwA1gAsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBxAC5AIwAsADaAMAAxgDKAOIA2ADOACwBJQEoAYoAAACEAAEAhACEAIQAhACEAIUAhACEAIYAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIcAhwCHAIcAhwCHAIcAhwCEAIQAhACEAIcAhACEAIQAhQCGAIQAhgCEAIQAhACEAIQAhACHAIcAhwCHAIcAhwCHAIcAhwCHAIcAhwCEAIQAhACEAIUAhACEAIcAhwCHAIcAhwCHAIcAhwCHAIQAhACEAIQAhACEAIQAhACEAIcAhwCHAIcAhwCHAIcAhwCHAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIcAhwCHAIcAhwCHAIcAhwCHAIcAAACEAIQAhAAAAQECAQEBAQEBAQEBAQEBAQEDAQEBAQEBAQMDAwMDAwMDAwMDAwMDAwMBAQEBAQMDAwEBAwEDAwMBAwEDAQEBAQMDAwEBAQEDAQEBAQEDAQEBAQAAAAAAAAAAAAAAAAAAAAQABQAGAAUABwAIAAkACgALAAwADQAOAA8AEAARABIAEwAUABUAFgAXABgAGQAaAAQAGgAbABoAHAAaABoAHQAaABoAGgAeAB8AIAAaACEAGgAiACMAJAAlAAQAGgAaABoABAAEABoABAAaABoAGgAEABoABAAaAAQABAAEAAQAGgAmACYABAAEAAQABAAaAAQABAAEAAQABAAaAAQABAAnACgALAAuADUANQA4ADYAOgA5AC8APAAwADcAOwA1ADUALAAtAD8AQABBAC4APQA+AEMARAA1ADUALwBLADAARwAtADUANQA1ADUANQA1ADUANQBIADUANQBJADUANQA1ADUASgA1ADUATAA1ADUATgA1ADUATQA0AE8AWQA1ADUAUABeADUANQBTAFgAVAB5AFUAVgBXAFoANQA1AEYANQA1AFsANQA1AFwANQA1ADUANQAuAFEAUgBDAEQANQA1AC8AXQBFAF8ANQA1ADUANQBgADUANQBhADUANQBGADUANQA1ADUAegB9AHwANQA1AHsANQA1AFgANQA1ADUANQA1ADUANQA1AHkARQA1ADUAYgBjAGQAZQCAADUANQBmAGcAaAA1ADUAaQB+AGoAawCEADUANQA1ADUAbAAxAH8ANQA1AG0AbgBvAHAAcwBxAHIANQA1AIMAdAB1ADMAgQA1ADUAdgCCADIAKQA1ADUAQgB3ADUANQA1ADUANQA1AHgAMwAyADEAKQCEADUANQA1ADUANQA1AIQAhACEAIQAhACEADUANQAqAIQAKgArACsAKwADAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAhACEAIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAAAAAAAAAAAAH4AfQB8AHsAZXhwcl9zdWZmaXgAZXhwcl9wcmVmaXgALSsgICAwWDB4AC0wWCswWCAwWC0weCsweCAweABTdGFjayBub3cAZmF0YWwgZXJyb3IgLSBzY2FubmVyIGlucHV0IGJ1ZmZlciBvdmVyZmxvdwBzdG10X2xpc3QAZnVuY19hcmdzX2xpc3QAdmFyX2xpc3QAZGVjbF9saXN0AGFyZ19saXN0AG1ldGhvZF9saXN0AGZpZWxkX2xpc3QAbWV0aG9kX2xpc3Rfb3B0AGZpZWxkX2xpc3Rfb3B0AGZ1bmNfYXJnc19vcHQAc3RtdF9ibG9ja19vcHQAJGFjY2VwdABzdG10AGV4cHJfbXVsdABzdG10X3JldABhcmdfcGFzcwBkZWNsX2NsYXNzAE5leHQgdG9rZW4gaXMAJXMuJXMAZXhwcgBleHByX3hvcgBlcnJvcgBzdG10X2ZvcgBpZGVudGlmaWNhZG9yAGRlY2xfdmFyAGVsc2Vfb3AAZXhwcl9jb21wAG91cm8AZmVycm8AbnVtZXJvAG1lcmN1cmlvAGZvZ28AY2h1bWJvAGFzc2lnbgBpbnZhbGlkIHRva2VuAG5hbgBudGVybQBmaW0AcHJvZ3JhbQBpbXBsAGRlY2wAc3RtdF9ibG9jawBjbGFzc19ibG9jawBpbnRlcmZfYmxvY2sAZnVuY19hcmcAU2hpZnRpbmcARGVsZXRpbmcAc3RyaW5nAEVycm9yOiBwb3BwaW5nAENsZWFudXA6IHBvcHBpbmcARXJyb3I6IGRpc2NhcmRpbmcAZGVjbF9pbnRlcmYAaW5mAHN0bXRfaWYAY29icmUAc3RtdF93aGlsZQBlbmQgb2YgZmlsZQBmYXRhbCBmbGV4IHNjYW5uZXIgaW50ZXJuYWwgZXJyb3ItLW5vIGFjdGlvbiBmb3VuZABleHByX2VuZABleHByX2FuZABmaWVsZABtZW1vcnkgZXhoYXVzdGVkAGZhdGFsIGZsZXggc2Nhbm5lciBpbnRlcm5hbCBlcnJvci0tZW5kIG9mIGJ1ZmZlciBtaXNzZWQAaW5wdXQgaW4gZmxleCBzY2FubmVyIGZhaWxlZABleHByX2FkZABDbGVhbnVwOiBkaXNjYXJkaW5nIGxvb2thaGVhZAAgJWQAbWFsbG9jAGRlY2xfZnVuYwByd2EAYWd1YQBwcmF0YQB0ZXJyYQBOQU4ASU5GAD4APj0APT0APD0AIT0ALT4gJCQgPQA8ADsAOgAvAEVycm8gbGV4aWNvIG5hIGxpbmhhICVkOiBzdWJzdGFuY2lhICclcycgZGVzY29uaGVjaWRhLgAtACwAKwAqAChudWxsKQBvdXQgb2YgZHluYW1pYyBtZW1vcnkgaW4geXlfZ2V0X25leHRfYnVmZmVyKCkAb3V0IG9mIGR5bmFtaWMgbWVtb3J5IGluIHl5X2NyZWF0ZV9idWZmZXIoKQBvdXQgb2YgZHluYW1pYyBtZW1vcnkgaW4geXllbnN1cmVfYnVmZmVyX3N0YWNrKCkAJXMgJXMgKAAnIG91ICcAJyBpbmVzcGVyYWRhLCBlc3BlcmF2YSBzZSBwb3IgJwBzdWJzdMOibmNpYSAnACcsICcAJgAlACVzIAAgICAkJWQgPSAARXJybyBkZSBzaW50YXhlIG5hIGxpbmhhICVkOiAAJXMKAFJlYWRpbmcgYSB0b2tlbgoAU3RhcnRpbmcgcGFyc2UKAFN0YWNrIHNpemUgaW5jcmVhc2VkIHRvICVsZAoARW50ZXJpbmcgc3RhdGUgJWQKAE5hbyBmb2kgcG9zc2l2ZWwgYWJyaXIgYSByZWNlaXRhCgBSZWR1Y2luZyBzdGFjayBieSBydWxlICVkIChsaW5lICVkKToKAE5vdyBhdCBlbmQgb2YgaW5wdXQuCgBJbmdyZWRpZW50ZSAlcyByZXBpdGlkby4KAFByb2R1dG8gZGVzY29uaGVjaWRvLgoAVGFiZWxhIGRlIFNpbWJvbG9zIEVudHVwaWRhLgoAJy4KAE91cm8gcHJvZHV6aWRvIGNvbSBzdWNlc3NvIQoAAAAAAAAAAAAAAAAAZQCF/+L/5P8bAB0AJgCF/4QAhf+F/4X/hf8lACUABQCF/0AAQgCF/4X/3ABEAEkA3ADcABsAMgDcANwA3ADcANwA3ACF/4X/hf+F/0oASwBMAJQADQA+AIX/QQCF/10Ahf9PAIX/DgBKAIX/WwBoAGYAhf8KAIX/hf+F/4X/hf8EANwA3AA2ANwA3ADcANwA3ADcANwA3ADcANwA3ABRAIX/bABdAIX/hf9uAE8Ahf/cANwAcwAyAIX/hf9LAEwAlACF/w0ADQANAA0ADQANAD4APgCF/4X/hf8QAHEAhf+F/4X/hf+F/4X/SgBKANwAhf/cAIX/GACF/5MAhf+F/2MA3ADcALkA3ACF/4X/cAB0AIX/hf+F/4X/hf8jANEAGAAYAIcASgCF/5MA0QBjAIX/bQCTANwAhf+F/40Ahf+F/4X/IQCTANEAhf+NAJMAhf8AAAAAAAAAAAAAAAAAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIBAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJgAAAAAAAAAAAAAVAAAAAAAYABkAAQAkABwAJAAIAAgABwAdAB4AHwAgACEADAAIAA8AEAARAJAAkQAUAI8AFgALAA8AEACDABUAlgAJAB0AFQCeABUAAAAjACQAJQAmAB0ApgAVAKQADgAvAAwAMQAxAJkAmgAVAAEAFQBOAEsATABNAAcAowAkAB0AJACnAFgAWQAPABAAEQAHAAcAFAALABYACQANABEAEgATAAkAUgAFAAYAJABWAFYAIwAkACUAJgBJAEoAFQAUABYAdwAGAHkAAAABAAwAAwAEAAUABgCBAIIAAQCEAAgACwAFAAYABwAkAAoACgAKAAgACgAOAA8AEAARAAwAHQAUAA4AFgAAAAEAmwADAAQABQAGAB4AHwAgACEAIgAjACQAJQAmAAEADgAJAAgABQAGAAcAGgAOAAoAWwBAAJUADgAPABAAEQBBAFYAFAB5ABYA//8XABgAGQAaABsAHAAeAP//IAAhACIAIwAkACUAJgABAEIA/////wUABgAHAEMARABFAEYARwBIAA4ADwAQABEA/////xQA//8WAP////8BAP//////////HgAHACAAIQAiACMAJAAlACYADwAQABEABwD//xQA//8WAP///////w8AEAARAP////8UAP//FgD//yMAJAAlACYA//////////////////8jACQAJQAmAAAAAAAAAAAAAAAmAAoACQAzADQAXQANADoADgAKAAkAHAA7ADwAPQA+AD8AGABcAB0AHgAfAJkAmgAgAJgAIQB5AEkASgCSAEAAnQB9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ZXF1ZW5jZQBEb21haW4gZXJyb3IAUmVzdWx0IG5vdCByZXByZXNlbnRhYmxlAE5vdCBhIHR0eQBQZXJtaXNzaW9uIGRlbmllZABPcGVyYXRpb24gbm90IHBlcm1pdHRlZABObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5AE5vIHN1Y2ggcHJvY2VzcwBGaWxlIGV4aXN0cwBWYWx1ZSB0b28gbGFyZ2UgZm9yIGRhdGEgdHlwZQBObyBzcGFjZSBsZWZ0IG9uIGRldmljZQBPdXQgb2YgbWVtb3J5AFJlc291cmNlIGJ1c3kASW50ZXJydXB0ZWQgc3lzdGVtIGNhbGwAUmVzb3VyY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUASW52YWxpZCBzZWVrAENyb3NzLWRldmljZSBsaW5rAFJlYWQtb25seSBmaWxlIHN5c3RlbQBEaXJlY3Rvcnkgbm90IGVtcHR5AENvbm5lY3Rpb24gcmVzZXQgYnkgcGVlcgBPcGVyYXRpb24gdGltZWQgb3V0AENvbm5lY3Rpb24gcmVmdXNlZABIb3N0IGlzIGRvd24ASG9zdCBpcyB1bnJlYWNoYWJsZQBBZGRyZXNzIGluIHVzZQBCcm9rZW4gcGlwZQBJL08gZXJyb3IATm8gc3VjaCBkZXZpY2Ugb3IgYWRkcmVzcwBCbG9jayBkZXZpY2UgcmVxdWlyZWQATm8gc3VjaCBkZXZpY2UATm90IGEgZGlyZWN0b3J5AElzIGEgZGlyZWN0b3J5AFRleHQgZmlsZSBidXN5AEV4ZWMgZm9ybWF0IGVycm9yAEludmFsaWQgYXJndW1lbnQAQXJndW1lbnQgbGlzdCB0b28gbG9uZwBTeW1ib2xpYyBsaW5rIGxvb3AARmlsZW5hbWUgdG9vIGxvbmcAVG9vIG1hbnkgb3BlbiBmaWxlcyBpbiBzeXN0ZW0ATm8gZmlsZSBkZXNjcmlwdG9ycyBhdmFpbGFibGUAQmFkIGZpbGUgZGVzY3JpcHRvcgBObyBjaGlsZCBwcm9jZXNzAEJhZCBhZGRyZXNzAEZpbGUgdG9vIGxhcmdlAFRvbyBtYW55IGxpbmtzAE5vIGxvY2tzIGF2YWlsYWJsZQBSZXNvdXJjZSBkZWFkbG9jayB3b3VsZCBvY2N1cgBTdGF0ZSBub3QgcmVjb3ZlcmFibGUAUHJldmlvdXMgb3duZXIgZGllZABPcGVyYXRpb24gY2FuY2VsZWQARnVuY3Rpb24gbm90IGltcGxlbWVudGVkAE5vIG1lc3NhZ2Ugb2YgZGVzaXJlZCB0eXBlAElkZW50aWZpZXIgcmVtb3ZlZABEZXZpY2Ugbm90IGEgc3RyZWFtAE5vIGRhdGEgYXZhaWxhYmxlAERldmljZSB0aW1lb3V0AE91dCBvZiBzdHJlYW1zIHJlc291cmNlcwBMaW5rIGhhcyBiZWVuIHNldmVyZWQAUHJvdG9jb2wgZXJyb3IAQmFkIG1lc3NhZ2UARmlsZSBkZXNjcmlwdG9yIGluIGJhZCBzdGF0ZQBOb3QgYSBzb2NrZXQARGVzdGluYXRpb24gYWRkcmVzcyByZXF1aXJlZABNZXNzYWdlIHRvbyBsYXJnZQBQcm90b2NvbCB3cm9uZyB0eXBlIGZvciBzb2NrZXQAUHJvdG9jb2wgbm90IGF2YWlsYWJsZQBQcm90b2NvbCBub3Qgc3VwcG9ydGVkAFNvY2tldCB0eXBlIG5vdCBzdXBwb3J0ZWQATm90IHN1cHBvcnRlZABQcm90b2NvbCBmYW1pbHkgbm90IHN1cHBvcnRlZABBZGRyZXNzIGZhbWlseSBub3Qgc3VwcG9ydGVkIGJ5IHByb3RvY29sAEFkZHJlc3Mgbm90IGF2YWlsYWJsZQBOZXR3b3JrIGlzIGRvd24ATmV0d29yayB1bnJlYWNoYWJsZQBDb25uZWN0aW9uIHJlc2V0IGJ5IG5ldHdvcmsAQ29ubmVjdGlvbiBhYm9ydGVkAE5vIGJ1ZmZlciBzcGFjZSBhdmFpbGFibGUAU29ja2V0IGlzIGNvbm5lY3RlZABTb2NrZXQgbm90IGNvbm5lY3RlZABDYW5ub3Qgc2VuZCBhZnRlciBzb2NrZXQgc2h1dGRvd24AT3BlcmF0aW9uIGFscmVhZHkgaW4gcHJvZ3Jlc3MAT3BlcmF0aW9uIGluIHByb2dyZXNzAFN0YWxlIGZpbGUgaGFuZGxlAFJlbW90ZSBJL08gZXJyb3IAUXVvdGEgZXhjZWVkZWQATm8gbWVkaXVtIGZvdW5kAFdyb25nIG1lZGl1bSB0eXBlAE11bHRpaG9wIGF0dGVtcHRlZABSZXF1aXJlZCBrZXkgbm90IGF2YWlsYWJsZQBLZXkgaGFzIGV4cGlyZWQAS2V5IGhhcyBiZWVuIHJldm9rZWQAS2V5IHdhcyByZWplY3RlZCBieSBzZXJ2aWNlAAAAAAAAAAAAAAAAAAAAAAClAlsA8AG1BYwFJQGDBh0DlAT/AMcDMQMLBrwBjwF/A8oEKwDaBq8AQgNOA9wBDgQVAKEGDQGUAgsCOAZkArwC/wJdA+cECwfPAssF7wXbBeECHgZFAoUAggJsA28E8QDzAxgF2QDaA0wGVAJ7AZ0DvQQAAFEAFQK7ALMDbQD/AYUELwX5BDgAZQFGAZ8AtwaoAXMCUwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhBAAAAAAAAAAALwIAAAAAAAAAAAAAAAAAAAAAAAAAADUERwRWBAAAAAAAAAAAAAAAAAAAAACgBAAAAAAAAAAAAAAAAAAAAAAAAEYFYAVuBWEGAADPAQAAAAAAAAAAyQbpBvkGHgc5B0kHXgcAAAAAAAAAAAAAAAAZAAsAGRkZAAAAAAUAAAAAAAAJAAAAAAsAAAAAAAAAABkACgoZGRkDCgcAAQAJCxgAAAkGCwAACwAGGQAAABkZGQAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAZAAsNGRkZAA0AAAIACQ4AAAAJAA4AAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAEwAAAAATAAAAAAkMAAAAAAAMAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAA8AAAAEDwAAAAAJEAAAAAAAEAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAAAAAAAAAAAARAAAAABEAAAAACRIAAAAAABIAABIAABoAAAAaGhoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGgAAABoaGgAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAABcAAAAAFwAAAAAJFAAAAAAAFAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWAAAAAAAAAAAAAAAVAAAAABUAAAAACRYAAAAAABYAABYAADAxMjM0NTY3ODlBQkNERUYAQdDPBAvIAwEAAAAAAAAABQAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAIAAADcKgEAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAP//////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2CcBAAAAAAAJAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAgAAAOgqAQAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAABwAAAPguAQAABAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAA/////woAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKQEA8DQBAA==';
    return f;
}

var wasmBinaryFile;

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  var binary = tryParseAsDataURI(file);
  if (binary) {
    return binary;
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw 'both async and sync fetching of the wasm failed';
}

function getBinaryPromise(binaryFile) {

  // Otherwise, getBinarySync should be able to get it synchronously
  return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateArrayBuffer(binaryFile, imports, receiver) {
  return getBinaryPromise(binaryFile).then((binary) => {
    return WebAssembly.instantiate(binary, imports);
  }).then(receiver, (reason) => {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    // Warn on some common problems.
    if (isFileURI(wasmBinaryFile)) {
      err(`warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
    }
    abort(reason);
  });
}

function instantiateAsync(binary, binaryFile, imports, callback) {
  return instantiateArrayBuffer(binaryFile, imports, callback);
}

function getWasmImports() {
  // prepare imports
  return {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  }
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;

    

    wasmMemory = wasmExports['memory'];
    
    assert(wasmMemory, 'memory not found in wasm exports');
    updateMemoryViews();

    addOnInit(wasmExports['__wasm_call_ctors']);

    removeRunDependency('wasm-instantiate');
    return wasmExports;
  }
  // wait for the pthread pool (if any)
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    receiveInstance(result['instance']);
  }

  var info = getWasmImports();

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {
    try {
      return Module['instantiateWasm'](info, receiveInstance);
    } catch(e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`);
        return false;
    }
  }

  wasmBinaryFile ??= findWasmBinary();

  instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult);
  return {}; // no exports yet; we'll fill them in later
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;
var tempI64;

// include: runtime_debug.js
// Endianness check
(() => {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) throw 'Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)';
})();

if (Module['ENVIRONMENT']) {
  throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
}

function legacyModuleProp(prop, newName, incoming=true) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      get() {
        let extra = incoming ? ' (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)' : '';
        abort(`\`Module.${prop}\` has been replaced by \`${newName}\`` + extra);

      }
    });
  }
}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

/**
 * Intercept access to a global symbol.  This enables us to give informative
 * warnings/errors when folks attempt to use symbols they did not include in
 * their build, or no symbols that no longer exist.
 */
function hookGlobalSymbolAccess(sym, func) {
  if (typeof globalThis != 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        func();
        return undefined;
      }
    });
  }
}

function missingGlobal(sym, msg) {
  hookGlobalSymbolAccess(sym, () => {
    warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
  });
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');
missingGlobal('asm', 'Please use wasmExports instead');

function missingLibrarySymbol(sym) {
  hookGlobalSymbolAccess(sym, () => {
    // Can't `abort()` here because it would break code that does runtime
    // checks.  e.g. `if (typeof SDL === 'undefined')`.
    var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
    // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
    // library.js, which means $name for a JS name with no prefix, or name
    // for a JS name like _name.
    var librarySymbol = sym;
    if (!librarySymbol.startsWith('_')) {
      librarySymbol = '$' + sym;
    }
    msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
    if (isExportedByForceFilesystem(sym)) {
      msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
    }
    warnOnce(msg);
  });

  // Any symbol that is not included from the JS library is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      }
    });
  }
}

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(...args) {
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn(...args);
}
// end include: runtime_debug.js
// === Body ===
// end include: preamble.js


  class ExitStatus {
      name = 'ExitStatus';
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };

  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': return HEAP8[ptr];
      case 'i8': return HEAP8[ptr];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': abort('to do getValue(i64) use WASM_BIGINT');
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      case '*': return HEAPU32[((ptr)>>2)];
      default: abort(`invalid type for getValue: ${type}`);
    }
  }

  var noExitRuntime = Module['noExitRuntime'] || true;

  var ptrToString = (ptr) => {
      assert(typeof ptr === 'number');
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      ptr >>>= 0;
      return '0x' + ptr.toString(16).padStart(8, '0');
    };

  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[ptr] = value; break;
      case 'i8': HEAP8[ptr] = value; break;
      case 'i16': HEAP16[((ptr)>>1)] = value; break;
      case 'i32': HEAP32[((ptr)>>2)] = value; break;
      case 'i64': abort('to do setValue(i64) use WASM_BIGINT');
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort(`invalid type for setValue: ${type}`);
    }
  }

  var stackRestore = (val) => __emscripten_stack_restore(val);

  var stackSave = () => _emscripten_stack_get_current();

  var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text;
        err(text);
      }
    };

  /** @suppress {duplicate } */
  var syscallGetVarargI = () => {
      assert(SYSCALLS.varargs != undefined);
      // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
      var ret = HEAP32[((+SYSCALLS.varargs)>>2)];
      SYSCALLS.varargs += 4;
      return ret;
    };
  var syscallGetVarargP = syscallGetVarargI;
  
  
  var PATH = {
  isAbs:(path) => path.charAt(0) === '/',
  splitPath:(filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
  normalizeArray:(parts, allowAboveRoot) => {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
  normalize:(path) => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
  dirname:(path) => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },
  basename:(path) => {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        path = PATH.normalize(path);
        path = path.replace(/\/$/, "");
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },
  join:(...paths) => PATH.normalize(paths.join('/')),
  join2:(l, r) => PATH.normalize(l + '/' + r),
  };
  
  var initRandomFill = () => {
      if (typeof crypto == 'object' && typeof crypto['getRandomValues'] == 'function') {
        // for modern web browsers
        return (view) => crypto.getRandomValues(view);
      } else
      if (ENVIRONMENT_IS_NODE) {
        // for nodejs with or without crypto support included
        try {
          var crypto_module = require('crypto');
          var randomFillSync = crypto_module['randomFillSync'];
          if (randomFillSync) {
            // nodejs with LTS crypto support
            return (view) => crypto_module['randomFillSync'](view);
          }
          // very old nodejs with the original crypto API
          var randomBytes = crypto_module['randomBytes'];
          return (view) => (
            view.set(randomBytes(view.byteLength)),
            // Return the original view to match modern native implementations.
            view
          );
        } catch (e) {
          // nodejs doesn't have crypto support
        }
      }
      // we couldn't find a proper implementation, as Math.random() is not suitable for /dev/random, see emscripten-core/emscripten/pull/7096
      abort('no cryptographic support found for randomDevice. consider polyfilling it if you want to use something insecure like Math.random(), e.g. put this in a --pre-js: var crypto = { getRandomValues: (array) => { for (var i = 0; i < array.length; i++) array[i] = (Math.random()*256)|0 } };');
    };
  var randomFill = (view) => {
      // Lazily init on the first invocation.
      return (randomFill = initRandomFill())(view);
    };
  
  
  
  var PATH_FS = {
  resolve:(...args) => {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? args[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path != 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = PATH.isAbs(path);
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },
  relative:(from, to) => {
        from = PATH_FS.resolve(from).substr(1);
        to = PATH_FS.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      },
  };
  
  
  var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder() : undefined;
  
    /**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number=} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.  Also, use the length info to avoid running tiny
      // strings through TextDecoder, since .subarray() allocates garbage.
      // (As a tiny code save trick, compare endPtr against endIdx using a negation,
      // so that undefined/NaN means Infinity)
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      // If building with TextDecoder, we have already computed the string length
      // above, so test loop end condition against that
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte ' + ptrToString(u0) + ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!');
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
  var FS_stdin_getChar_buffer = [];
  
  var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
  
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xD800 && u <= 0xDFFF) {
          var u1 = str.charCodeAt(++i);
          u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
        }
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 0x10FFFF) warnOnce('Invalid Unicode code point ' + ptrToString(u) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).');
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
  /** @type {function(string, boolean=, number=)} */
  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  }
  var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          // we will read data by chunks of BUFSIZE
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
  
          // For some reason we must suppress a closure warning here, even though
          // fd definitely exists on process.stdin, and is even the proper way to
          // get the fd of stdin,
          // https://github.com/nodejs/help/issues/2136#issuecomment-523649904
          // This started to happen after moving this logic out of library_tty.js,
          // so it is related to the surrounding code in some unclear manner.
          /** @suppress {missingProperties} */
          var fd = process.stdin.fd;
  
          try {
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
          } catch(e) {
            // Cross-platform differences: on Windows, reading EOF throws an
            // exception, but on other OSes, reading EOF returns 0. Uniformize
            // behavior by treating the EOF exception to return 0.
            if (e.toString().includes('EOF')) bytesRead = 0;
            else throw e;
          }
  
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString('utf-8');
          }
        } else
        if (typeof window != 'undefined' &&
          typeof window.prompt == 'function') {
          // Browser.
          result = window.prompt('Input: ');  // returns null on cancel
          if (result !== null) {
            result += '\n';
          }
        } else
        {}
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
  var TTY = {
  ttys:[],
  init() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process.stdin.setEncoding('utf8');
        // }
      },
  shutdown() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process.stdin.pause();
        // }
      },
  register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
  stream_ops:{
  open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
  close(stream) {
          // flush any pending line data
          stream.tty.ops.fsync(stream.tty);
        },
  fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
  read(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },
  write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        },
  },
  default_tty_ops:{
  get_char(tty) {
          return FS_stdin_getChar();
        },
  put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },
  fsync(tty) {
          if (tty.output && tty.output.length > 0) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  ioctl_tcgets(tty) {
          // typical setting
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
              0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]
          };
        },
  ioctl_tcsets(tty, optional_actions, data) {
          // currently just ignore
          return 0;
        },
  ioctl_tiocgwinsz(tty) {
          return [24, 80];
        },
  },
  default_tty1_ops:{
  put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
  fsync(tty) {
          if (tty.output && tty.output.length > 0) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  },
  };
  
  
  var zeroMemory = (address, size) => {
      HEAPU8.fill(0, address, address + size);
    };
  
  var alignMemory = (size, alignment) => {
      assert(alignment, "alignment argument is required");
      return Math.ceil(size / alignment) * alignment;
    };
  var mmapAlloc = (size) => {
      abort('internal error: mmapAlloc called but `emscripten_builtin_memalign` native symbol not exported');
    };
  var MEMFS = {
  ops_table:null,
  mount(mount) {
        return MEMFS.createNode(null, '/', 16895, 0);
      },
  createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(63);
        }
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              allocate: MEMFS.stream_ops.allocate,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
          parent.timestamp = node.timestamp;
        }
        return node;
      },
  getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },
  expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
        // avoid overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
      },
  resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
        } else {
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
        }
      },
  node_ops:{
  getattr(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
  setattr(node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
  lookup(parent, name) {
          throw new FS.ErrnoError(44);
        },
  mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
  rename(old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.parent.timestamp = Date.now()
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          new_dir.timestamp = old_node.parent.timestamp;
        },
  unlink(parent, name) {
          delete parent.contents[name];
          parent.timestamp = Date.now();
        },
  rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.timestamp = Date.now();
        },
  readdir(node) {
          var entries = ['.', '..'];
          for (var key of Object.keys(node.contents)) {
            entries.push(key);
          }
          return entries;
        },
  symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0o777 | 40960, 0);
          node.link = oldpath;
          return node;
        },
  readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        },
  },
  stream_ops:{
  read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },
  write(stream, buffer, offset, length, position, canOwn) {
          // The data buffer should be a typed array view
          assert(!(buffer instanceof ArrayBuffer));
          // If the buffer is located in main memory (HEAP), and if
          // memory can grow, we can't hold on to references of the
          // memory buffer, as they may get invalidated. That means we
          // need to do copy its contents.
          if (buffer.buffer === HEAP8.buffer) {
            canOwn = false;
          }
  
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) {
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) {
            // Use typed array write which is available.
            node.contents.set(buffer.subarray(offset, offset + length), position);
          } else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },
  llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
  allocate(stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },
  mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents && contents.buffer === HEAP8.buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the
            // buffer we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            if (contents) {
              // Try to avoid unnecessary slices.
              if (position > 0 || position + length < contents.length) {
                if (contents.subarray) {
                  contents = contents.subarray(position, position + length);
                } else {
                  contents = Array.prototype.slice.call(contents, position, position + length);
                }
              }
              HEAP8.set(contents, ptr);
            }
          }
          return { ptr, allocated };
        },
  msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        },
  },
  };
  
  /** @param {boolean=} noRunDep */
  var asyncLoad = (url, onload, onerror, noRunDep) => {
      var dep = !noRunDep ? getUniqueRunDependency(`al ${url}`) : '';
      readAsync(url).then(
        (arrayBuffer) => {
          assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
          onload(new Uint8Array(arrayBuffer));
          if (dep) removeRunDependency(dep);
        },
        (err) => {
          if (onerror) {
            onerror();
          } else {
            throw `Loading data file "${url}" failed.`;
          }
        }
      );
      if (dep) addRunDependency(dep);
    };
  
  
  var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
      FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
    };
  
  var preloadPlugins = Module['preloadPlugins'] || [];
  var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
      // Ensure plugins are ready.
      if (typeof Browser != 'undefined') Browser.init();
  
      var handled = false;
      preloadPlugins.forEach((plugin) => {
        if (handled) return;
        if (plugin['canHandle'](fullname)) {
          plugin['handle'](byteArray, fullname, finish, onerror);
          handled = true;
        }
      });
      return handled;
    };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      // TODO we should allow people to just pass in a complete filename instead
      // of parent and name being that we just join them anyways
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`); // might have several active requests for the same fullname
      function processData(byteArray) {
        function finish(byteArray) {
          preFinish?.();
          if (!dontCreateFile) {
            FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
          }
          onload?.();
          removeRunDependency(dep);
        }
        if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
          onerror?.();
          removeRunDependency(dep);
        })) {
          return;
        }
        finish(byteArray);
      }
      addRunDependency(dep);
      if (typeof url == 'string') {
        asyncLoad(url, processData, onerror);
      } else {
        processData(url);
      }
    };
  
  var FS_modeStringToFlags = (str) => {
      var flagModes = {
        'r': 0,
        'r+': 2,
        'w': 512 | 64 | 1,
        'w+': 512 | 64 | 2,
        'a': 1024 | 64 | 1,
        'a+': 1024 | 64 | 2,
      };
      var flags = flagModes[str];
      if (typeof flags == 'undefined') {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
  
  var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
  
  
  
  
  
  
    /**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */
  var UTF8ToString = (ptr, maxBytesToRead) => {
      assert(typeof ptr == 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
    };
  
  var strError = (errno) => UTF8ToString(_strerror(errno));
  
  var ERRNO_CODES = {
      'EPERM': 63,
      'ENOENT': 44,
      'ESRCH': 71,
      'EINTR': 27,
      'EIO': 29,
      'ENXIO': 60,
      'E2BIG': 1,
      'ENOEXEC': 45,
      'EBADF': 8,
      'ECHILD': 12,
      'EAGAIN': 6,
      'EWOULDBLOCK': 6,
      'ENOMEM': 48,
      'EACCES': 2,
      'EFAULT': 21,
      'ENOTBLK': 105,
      'EBUSY': 10,
      'EEXIST': 20,
      'EXDEV': 75,
      'ENODEV': 43,
      'ENOTDIR': 54,
      'EISDIR': 31,
      'EINVAL': 28,
      'ENFILE': 41,
      'EMFILE': 33,
      'ENOTTY': 59,
      'ETXTBSY': 74,
      'EFBIG': 22,
      'ENOSPC': 51,
      'ESPIPE': 70,
      'EROFS': 69,
      'EMLINK': 34,
      'EPIPE': 64,
      'EDOM': 18,
      'ERANGE': 68,
      'ENOMSG': 49,
      'EIDRM': 24,
      'ECHRNG': 106,
      'EL2NSYNC': 156,
      'EL3HLT': 107,
      'EL3RST': 108,
      'ELNRNG': 109,
      'EUNATCH': 110,
      'ENOCSI': 111,
      'EL2HLT': 112,
      'EDEADLK': 16,
      'ENOLCK': 46,
      'EBADE': 113,
      'EBADR': 114,
      'EXFULL': 115,
      'ENOANO': 104,
      'EBADRQC': 103,
      'EBADSLT': 102,
      'EDEADLOCK': 16,
      'EBFONT': 101,
      'ENOSTR': 100,
      'ENODATA': 116,
      'ETIME': 117,
      'ENOSR': 118,
      'ENONET': 119,
      'ENOPKG': 120,
      'EREMOTE': 121,
      'ENOLINK': 47,
      'EADV': 122,
      'ESRMNT': 123,
      'ECOMM': 124,
      'EPROTO': 65,
      'EMULTIHOP': 36,
      'EDOTDOT': 125,
      'EBADMSG': 9,
      'ENOTUNIQ': 126,
      'EBADFD': 127,
      'EREMCHG': 128,
      'ELIBACC': 129,
      'ELIBBAD': 130,
      'ELIBSCN': 131,
      'ELIBMAX': 132,
      'ELIBEXEC': 133,
      'ENOSYS': 52,
      'ENOTEMPTY': 55,
      'ENAMETOOLONG': 37,
      'ELOOP': 32,
      'EOPNOTSUPP': 138,
      'EPFNOSUPPORT': 139,
      'ECONNRESET': 15,
      'ENOBUFS': 42,
      'EAFNOSUPPORT': 5,
      'EPROTOTYPE': 67,
      'ENOTSOCK': 57,
      'ENOPROTOOPT': 50,
      'ESHUTDOWN': 140,
      'ECONNREFUSED': 14,
      'EADDRINUSE': 3,
      'ECONNABORTED': 13,
      'ENETUNREACH': 40,
      'ENETDOWN': 38,
      'ETIMEDOUT': 73,
      'EHOSTDOWN': 142,
      'EHOSTUNREACH': 23,
      'EINPROGRESS': 26,
      'EALREADY': 7,
      'EDESTADDRREQ': 17,
      'EMSGSIZE': 35,
      'EPROTONOSUPPORT': 66,
      'ESOCKTNOSUPPORT': 137,
      'EADDRNOTAVAIL': 4,
      'ENETRESET': 39,
      'EISCONN': 30,
      'ENOTCONN': 53,
      'ETOOMANYREFS': 141,
      'EUSERS': 136,
      'EDQUOT': 19,
      'ESTALE': 72,
      'ENOTSUP': 138,
      'ENOMEDIUM': 148,
      'EILSEQ': 25,
      'EOVERFLOW': 61,
      'ECANCELED': 11,
      'ENOTRECOVERABLE': 56,
      'EOWNERDEAD': 62,
      'ESTRPIPE': 135,
    };
  var FS = {
  root:null,
  mounts:[],
  devices:{
  },
  streams:[],
  nextInode:1,
  nameTable:null,
  currentPath:"/",
  initialized:false,
  ignorePermissions:true,
  ErrnoError:class extends Error {
        name = 'ErrnoError';
        // We set the `name` property to be able to identify `FS.ErrnoError`
        // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
        // - when using PROXYFS, an error can come from an underlying FS
        // as different FS objects have their own FS.ErrnoError each,
        // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
        // we'll use the reliable test `err.name == "ErrnoError"` instead
        constructor(errno) {
          super(runtimeInitialized ? strError(errno) : '');
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
        }
      },
  filesystems:null,
  syncFSRequests:0,
  readFiles:{
  },
  FSStream:class {
        shared = {};
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return (this.flags & 1024);
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
  FSNode:class {
        node_ops = {};
        stream_ops = {};
        readMode = 292 | 73;
        writeMode = 146;
        mounted = null;
        constructor(parent, name, mode, rdev) {
          if (!parent) {
            parent = this;  // root node sets parent to itself
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.rdev = rdev;
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
      },
  lookupPath(path, opts = {}) {
        path = PATH_FS.resolve(path);
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        opts = Object.assign(defaults, opts)
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(32);
        }
  
        // split the absolute path
        var parts = path.split('/').filter((p) => !!p);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count + 1 });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(32);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },
  getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
  hashName(parentid, name) {
        var hash = 0;
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },
  hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
  hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
  lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },
  createNode(parent, name, mode, rdev) {
        assert(typeof parent == 'object')
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },
  destroyNode(node) {
        FS.hashRemoveNode(node);
      },
  isRoot(node) {
        return node === node.parent;
      },
  isMountpoint(node) {
        return !!node.mounted;
      },
  isFile(mode) {
        return (mode & 61440) === 32768;
      },
  isDir(mode) {
        return (mode & 61440) === 16384;
      },
  isLink(mode) {
        return (mode & 61440) === 40960;
      },
  isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
  isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
  isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
  isSocket(mode) {
        return (mode & 49152) === 49152;
      },
  flagsToPermissionString(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },
  nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        } else if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        } else if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
  mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
  mayCreate(dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },
  mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31;
          }
        }
        return 0;
      },
  mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== 'r' || // opening for write
              (flags & 512)) { // TODO: check for O_SEARCH? (== search for dir only)
            return 31;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },
  MAX_OPEN_FDS:4096,
  nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
  getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
  getStream:(fd) => FS.streams[fd],
  createStream(stream, fd = -1) {
        assert(fd >= -1);
  
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
  closeStream(fd) {
        FS.streams[fd] = null;
      },
  dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
  chrdev_stream_ops:{
  open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          stream.stream_ops.open?.(stream);
        },
  llseek() {
          throw new FS.ErrnoError(70);
        },
  },
  major:(dev) => ((dev) >> 8),
  minor:(dev) => ((dev) & 0xff),
  makedev:(ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
  getDevice:(dev) => FS.devices[dev],
  getMounts(mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push(...m.mounts);
        }
  
        return mounts;
      },
  syncfs(populate, callback) {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach((mount) => {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },
  mount(type, opts, mountpoint) {
        if (typeof type == 'string') {
          // The filesystem was not included, and instead we have an error
          // message stored in the variable.
          throw type;
        }
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type,
          opts,
          mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },
  unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach((hash) => {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },
  lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
  mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
  statfs(path) {
  
        // NOTE: None of the defaults here are true. We're just returning safe and
        //       sane values.
        var rtn = {
          bsize: 4096,
          frsize: 4096,
          blocks: 1e6,
          bfree: 5e5,
          bavail: 5e5,
          files: FS.nextInode,
          ffree: FS.nextInode - 1,
          fsid: 42,
          flags: 2,
          namelen: 255,
        };
  
        var parent = FS.lookupPath(path, {follow: true}).node;
        if (parent?.node_ops.statfs) {
          Object.assign(rtn, parent.node_ops.statfs(parent.mount.opts.root));
        }
        return rtn;
      },
  create(path, mode = 0o666) {
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
  mkdir(path, mode = 0o777) {
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
  mkdirTree(path, mode) {
        var dirs = path.split('/');
        var d = '';
        for (var i = 0; i < dirs.length; ++i) {
          if (!dirs[i]) continue;
          d += '/' + dirs[i];
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },
  mkdev(path, mode, dev) {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 0o666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
  symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
  rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
  
        // let the errors from non existent directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
  
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
          // update old node (we do this here to avoid each backend
          // needing to)
          old_node.parent = new_dir;
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },
  rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
  readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(54);
        }
        return node.node_ops.readdir(node);
      },
  unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
  readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return link.node_ops.readlink(link);
      },
  stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(63);
        }
        return node.node_ops.getattr(node);
      },
  lstat(path) {
        return FS.stat(path, true);
      },
  chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },
  lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
  fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.chmod(stream.node, mode);
      },
  chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },
  lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
  fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.chown(stream.node, uid, gid);
      },
  truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },
  ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.truncate(stream.node, len);
      },
  utime(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },
  open(path, flags, mode = 0o666) {
        if (path === "") {
          throw new FS.ErrnoError(44);
        }
        flags = typeof flags == 'string' ? FS_modeStringToFlags(flags) : flags;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path == 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512) && !created) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        });
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
          }
        }
        return stream;
      },
  close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
  isClosed(stream) {
        return stream.fd === null;
      },
  llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
  read(stream, buffer, offset, length, position) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
  write(stream, buffer, offset, length, position, canOwn) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
  allocate(stream, offset, length) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(28);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(138);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },
  mmap(stream, length, position, prot, flags) {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2) !== 0
            && (flags & 2) === 0
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        if (!length) {
          throw new FS.ErrnoError(28);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
  msync(stream, buffer, offset, length, mmapFlags) {
        assert(offset >= 0);
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
  ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
  readFile(path, opts = {}) {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error(`Invalid encoding type "${opts.encoding}"`);
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },
  writeFile(path, data, opts = {}) {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == 'string') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
        } else if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        } else {
          throw new Error('Unsupported data type');
        }
        FS.close(stream);
      },
  cwd:() => FS.currentPath,
  chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
  createDefaultDirectories() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },
  createDefaultDevices() {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
          llseek: () => 0,
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        // use a buffer to avoid overhead of individual crypto calls per byte
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (randomLeft === 0) {
            randomLeft = randomFill(randomBuffer).byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice('/dev', 'random', randomByte);
        FS.createDevice('/dev', 'urandom', randomByte);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },
  createSpecialDirectories() {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount() {
            var node = FS.createNode(proc_self, 'fd', 16895, 73);
            node.node_ops = {
              lookup(parent, name) {
                var fd = +name;
                var stream = FS.getStreamChecked(fd);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: () => stream.path },
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },
  createStandardStreams(input, output, error) {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (input) {
          FS.createDevice('/dev', 'stdin', input);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (output) {
          FS.createDevice('/dev', 'stdout', null, output);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (error) {
          FS.createDevice('/dev', 'stderr', null, error);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
        assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
        assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
        assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
      },
  staticInit() {
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
        };
      },
  init(input, output, error) {
        assert(!FS.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.initialized = true;
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input ??= Module['stdin'];
        output ??= Module['stdout'];
        error ??= Module['stderr'];
  
        FS.createStandardStreams(input, output, error);
      },
  quit() {
        FS.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        _fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },
  findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },
  analyzePath(path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },
  createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },
  createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
  createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data == 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
  createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        FS.createDevice.major ??= 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            // flush any pending line data
            if (output?.buffer?.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
  forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest != 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else { // Command-line.
          try {
            obj.contents = readBinary(obj.url);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
      },
  createLazyFile(parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array).
        // Actual getting is abstracted away for eventual reuse.
        class LazyUint8Array {
          lengthKnown = false;
          chunks = []; // Loaded chunks. Index is the chunk number
          get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = (idx / this.chunkSize)|0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
  
            var chunkSize = 1024*1024; // Chunk size in bytes
  
            if (!hasByteServing) chunkSize = datalength;
  
            // Function to get a range from the remote URL.
            var doXHR = (from, to) => {
              if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
              if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
              // Some hints to the browser that we want binary data.
              xhr.responseType = 'arraybuffer';
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
              }
  
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              if (xhr.response !== undefined) {
                return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
              }
              return intArrayFromString(xhr.responseText || '', true);
            };
            var lazyArray = this;
            lazyArray.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum+1) * chunkSize - 1; // including this byte
              end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
                lazyArray.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') throw new Error('doXHR failed!');
              return lazyArray.chunks[chunkNum];
            });
  
            if (usesGzip || !datalength) {
              // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
              chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out("LazyFiles on gzip forces download of the whole file when length is accessed");
            }
  
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._chunkSize;
          }
        }
  
        if (typeof XMLHttpRequest != 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((key) => {
          var fn = node.stream_ops[key];
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        });
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position)
        };
        // use a custom mmap function
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
  absolutePath() {
        abort('FS.absolutePath has been removed; use PATH_FS.resolve instead');
      },
  createFolder() {
        abort('FS.createFolder has been removed; use FS.mkdir instead');
      },
  createLink() {
        abort('FS.createLink has been removed; use FS.symlink instead');
      },
  joinPath() {
        abort('FS.joinPath has been removed; use PATH.join instead');
      },
  mmapAlloc() {
        abort('FS.mmapAlloc has been replaced by the top level function mmapAlloc');
      },
  standardizePath() {
        abort('FS.standardizePath has been removed; use PATH.normalize instead');
      },
  };
  
  var SYSCALLS = {
  DEFAULT_POLLMASK:5,
  calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        // relative path
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);;
          }
          return dir;
        }
        return PATH.join2(dir, path);
      },
  doStat(func, path, buf) {
        var stat = func(path);
        HEAP32[((buf)>>2)] = stat.dev;
        HEAP32[(((buf)+(4))>>2)] = stat.mode;
        HEAPU32[(((buf)+(8))>>2)] = stat.nlink;
        HEAP32[(((buf)+(12))>>2)] = stat.uid;
        HEAP32[(((buf)+(16))>>2)] = stat.gid;
        HEAP32[(((buf)+(20))>>2)] = stat.rdev;
        (tempI64 = [stat.size>>>0,(tempDouble = stat.size,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(24))>>2)] = tempI64[0],HEAP32[(((buf)+(28))>>2)] = tempI64[1]);
        HEAP32[(((buf)+(32))>>2)] = 4096;
        HEAP32[(((buf)+(36))>>2)] = stat.blocks;
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        (tempI64 = [Math.floor(atime / 1000)>>>0,(tempDouble = Math.floor(atime / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(40))>>2)] = tempI64[0],HEAP32[(((buf)+(44))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(48))>>2)] = (atime % 1000) * 1000 * 1000;
        (tempI64 = [Math.floor(mtime / 1000)>>>0,(tempDouble = Math.floor(mtime / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(56))>>2)] = tempI64[0],HEAP32[(((buf)+(60))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(64))>>2)] = (mtime % 1000) * 1000 * 1000;
        (tempI64 = [Math.floor(ctime / 1000)>>>0,(tempDouble = Math.floor(ctime / 1000),(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(72))>>2)] = tempI64[0],HEAP32[(((buf)+(76))>>2)] = tempI64[1]);
        HEAPU32[(((buf)+(80))>>2)] = (ctime % 1000) * 1000 * 1000;
        (tempI64 = [stat.ino>>>0,(tempDouble = stat.ino,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((buf)+(88))>>2)] = tempI64[0],HEAP32[(((buf)+(92))>>2)] = tempI64[1]);
        return 0;
      },
  doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          // MAP_PRIVATE calls need not to be synced back to underlying fs
          return 0;
        }
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
  getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
  varargs:undefined,
  getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },
  };
  function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = syscallGetVarargI();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.dupStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = syscallGetVarargI();
          stream.flags |= arg;
          return 0;
        }
        case 12: {
          var arg = syscallGetVarargP();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)] = 2;
          return 0;
        }
        case 13:
        case 14:
          return 0; // Pretend that the locking is successful.
      }
      return -28;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  
  function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[((argp)>>2)] = termios.c_iflag || 0;
            HEAP32[(((argp)+(4))>>2)] = termios.c_oflag || 0;
            HEAP32[(((argp)+(8))>>2)] = termios.c_cflag || 0;
            HEAP32[(((argp)+(12))>>2)] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) {
              HEAP8[(argp + i)+(17)] = termios.c_cc[i] || 0;
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[((argp)>>2)];
            var c_oflag = HEAP32[(((argp)+(4))>>2)];
            var c_cflag = HEAP32[(((argp)+(8))>>2)];
            var c_lflag = HEAP32[(((argp)+(12))>>2)];
            var c_cc = []
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[(argp + i)+(17)]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[((argp)>>2)] = 0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28; // not supported
        }
        case 21531: {
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          // TODO: in theory we should write to the winsize struct that gets
          // passed in, but for now musl doesn't read anything on it
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[((argp)>>1)] = winsize[0];
            HEAP16[(((argp)+(2))>>1)] = winsize[1];
          }
          return 0;
        }
        case 21524: {
          // TODO: technically, this ioctl call should change the window size.
          // but, since emscripten doesn't have any concept of a terminal window
          // yet, we'll just silently throw it away as we do TIOCGWINSZ
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default: return -28; // not supported
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  
  function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? syscallGetVarargI() : 0;
      return FS.open(path, flags, mode).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }

  var __emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);

  var getHeapMax = () =>
      // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
      // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
      // for any code that deals with heap sizes, which would require special
      // casing all heap size related code to treat 0 specially.
      2147483648;
  
  
  var growMemory = (size) => {
      var b = wasmMemory.buffer;
      var pages = ((size - b.byteLength + 65535) / 65536) | 0;
      try {
        // round size grow request up to wasm page size (fixed 64KB per spec)
        wasmMemory.grow(pages); // .grow() takes a delta compared to the previous size
        updateMemoryViews();
        return 1 /*success*/;
      } catch(e) {
        err(`growMemory: Attempted to grow heap from ${b.byteLength} bytes to ${size} bytes, but got error: ${e}`);
      }
      // implicit 0 return to save code size (caller will cast "undefined" into 0
      // anyhow)
    };
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      // With multithreaded builds, races can happen (another thread might increase the size
      // in between), so return a failure, and let the caller retry.
      assert(requestedSize > oldSize);
  
      // Memory resize rules:
      // 1.  Always increase heap size to at least the requested size, rounded up
      //     to next page multiple.
      // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
      //     geometrically: increase the heap size according to
      //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
      //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
      // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
      //     linearly: increase the heap size by at least
      //     MEMORY_GROWTH_LINEAR_STEP bytes.
      // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
      //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
      // 4.  If we were unable to allocate as much memory, it may be due to
      //     over-eager decision to excessively reserve due to (3) above.
      //     Hence if an allocation fails, cut down on the amount of excess
      //     growth, in an attempt to succeed to perform a smaller allocation.
  
      // A limit is set for how much we can grow. We should not exceed that
      // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
        return false;
      }
  
      // Loop through potential heap size increases. If we attempt a too eager
      // reservation that fails, cut down on the attempted size and reserve a
      // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown); // ensure geometric growth
        // but limit overreserving (default to capping at +96MB overgrowth at most)
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296 );
  
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
  
        var replacement = growMemory(newSize);
        if (replacement) {
  
          return true;
        }
      }
      err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
      return false;
    };

  
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module['onExit']?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
  
  
  /** @suppress {duplicate } */
  /** @param {boolean|number=} implicit */
  var exitJS = (status, implicit) => {
      EXITSTATUS = status;
  
      checkUnflushedContent();
  
      // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
      if (keepRuntimeAlive() && !implicit) {
        var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
        err(msg);
      }
  
      _proc_exit(status);
    };
  var _exit = exitJS;

  function _fd_close(fd) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  function _fd_fdstat_get(fd, pbuf) {
  try {
  
      var rightsBase = 0;
      var rightsInheriting = 0;
      var flags = 0;
      {
        var stream = SYSCALLS.getStreamFromFD(fd);
        // All character devices are terminals (other things a Linux system would
        // assume is a character device, like the mouse, we have special APIs for).
        var type = stream.tty ? 2 :
                   FS.isDir(stream.mode) ? 3 :
                   FS.isLink(stream.mode) ? 7 :
                   4;
      }
      HEAP8[pbuf] = type;
      HEAP16[(((pbuf)+(2))>>1)] = flags;
      (tempI64 = [rightsBase>>>0,(tempDouble = rightsBase,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((pbuf)+(8))>>2)] = tempI64[0],HEAP32[(((pbuf)+(12))>>2)] = tempI64[1]);
      (tempI64 = [rightsInheriting>>>0,(tempDouble = rightsInheriting,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[(((pbuf)+(16))>>2)] = tempI64[0],HEAP32[(((pbuf)+(20))>>2)] = tempI64[1]);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  /** @param {number=} offset */
  var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_read(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }

  
  var convertI32PairToI53Checked = (lo, hi) => {
      assert(lo == (lo >>> 0) || lo == (lo|0)); // lo should either be a i32 or a u32
      assert(hi === (hi|0));                    // hi should be a i32
      return ((hi + 0x200000) >>> 0 < 0x400001 - !!lo) ? (lo >>> 0) + hi * 4294967296 : NaN;
    };
  function _fd_seek(fd,offset_low, offset_high,whence,newOffset) {
    var offset = convertI32PairToI53Checked(offset_low, offset_high);
  
    
  try {
  
      if (isNaN(offset)) return 61;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      (tempI64 = [stream.position>>>0,(tempDouble = stream.position,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[((newOffset)>>2)] = tempI64[0],HEAP32[(((newOffset)+(4))>>2)] = tempI64[1]);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  ;
  }

  /** @param {number=} offset */
  var doWritev = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) {
          // No more space to write.
          break;
        }
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_write(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }


  var handleException = (e) => {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      checkStackCookie();
      if (e instanceof WebAssembly.RuntimeError) {
        if (_emscripten_stack_get_current() <= 0) {
          err('Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)');
        }
      }
      quit_(1, e);
    };

  
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  
  var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
  var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };

  var getCFunc = (ident) => {
      var func = Module['_' + ident]; // closure exported function
      assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
      return func;
    };
  
  
  var writeArrayToMemory = (array, buffer) => {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    };
  
  
  
  
  
  
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Arguments|Array=} args
     * @param {Object=} opts
     */
  var ccall = (ident, returnType, argTypes, args, opts) => {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== 'array', 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret);
      }
  
      ret = onDone(ret);
      return ret;
    };
  
    /**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */
  var cwrap = (ident, returnType, argTypes, opts) => {
      return (...args) => ccall(ident, returnType, argTypes, args, opts);
    };


  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.staticInit();
  // Set module methods based on EXPORTED_RUNTIME_METHODS
  ;
function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
}
var wasmImports = {
  /** @export */
  __syscall_fcntl64: ___syscall_fcntl64,
  /** @export */
  __syscall_ioctl: ___syscall_ioctl,
  /** @export */
  __syscall_openat: ___syscall_openat,
  /** @export */
  _emscripten_memcpy_js: __emscripten_memcpy_js,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */
  exit: _exit,
  /** @export */
  fd_close: _fd_close,
  /** @export */
  fd_fdstat_get: _fd_fdstat_get,
  /** @export */
  fd_read: _fd_read,
  /** @export */
  fd_seek: _fd_seek,
  /** @export */
  fd_write: _fd_write
};
var wasmExports = createWasm();
var ___wasm_call_ctors = createExportWrapper('__wasm_call_ctors', 0);
var _main = Module['_main'] = createExportWrapper('__main_argc_argv', 2);
var _fflush = createExportWrapper('fflush', 1);
var _strerror = createExportWrapper('strerror', 1);
var _emscripten_stack_init = () => (_emscripten_stack_init = wasmExports['emscripten_stack_init'])();
var _emscripten_stack_get_free = () => (_emscripten_stack_get_free = wasmExports['emscripten_stack_get_free'])();
var _emscripten_stack_get_base = () => (_emscripten_stack_get_base = wasmExports['emscripten_stack_get_base'])();
var _emscripten_stack_get_end = () => (_emscripten_stack_get_end = wasmExports['emscripten_stack_get_end'])();
var __emscripten_stack_restore = (a0) => (__emscripten_stack_restore = wasmExports['_emscripten_stack_restore'])(a0);
var __emscripten_stack_alloc = (a0) => (__emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc'])(a0);
var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'])();
var dynCall_jiji = Module['dynCall_jiji'] = createExportWrapper('dynCall_jiji', 5);


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

Module['callMain'] = callMain;
Module['ccall'] = ccall;
Module['cwrap'] = cwrap;
var missingLibrarySymbols = [
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromI64',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertU32PairToI53',
  'getTempRet0',
  'setTempRet0',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'emscriptenLog',
  'readEmAsmArgs',
  'jstoi_q',
  'getExecutableName',
  'listenOnce',
  'autoResumeAudioContext',
  'dynCallLegacy',
  'getDynCaller',
  'dynCall',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'asmjsMangle',
  'HandleAllocator',
  'getNativeTypeSize',
  'STACK_SIZE',
  'STACK_ALIGN',
  'POINTER_SIZE',
  'ASSERTIONS',
  'uleb128Encode',
  'sigToWasmTypes',
  'generateFuncType',
  'convertJsFunctionToWasm',
  'getEmptyTableSlot',
  'updateTableMap',
  'getFunctionAddress',
  'addFunction',
  'removeFunction',
  'reallyNegative',
  'unSign',
  'strLen',
  'reSign',
  'formatString',
  'intArrayToString',
  'AsciiToString',
  'stringToAscii',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'stringToNewUTF8',
  'registerKeyEventCallback',
  'maybeCStringToJsString',
  'findEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'battery',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'jsStackTrace',
  'getCallstack',
  'convertPCtoSourceLocation',
  'getEnvStrings',
  'checkWasiClock',
  'wasiRightsToMuslOFlags',
  'wasiOFlagsToMuslOFlags',
  'safeSetTimeout',
  'setImmediateWrapped',
  'safeRequestAnimationFrame',
  'clearImmediateWrapped',
  'polyfillSetImmediate',
  'registerPostMainLoop',
  'registerPreMainLoop',
  'getPromise',
  'makePromise',
  'idsToPromises',
  'makePromiseCallback',
  'ExceptionInfo',
  'findMatchingCatch',
  'Browser_asyncPrepareDataCounter',
  'isLeapYear',
  'ydayFromDate',
  'arraySum',
  'addDays',
  'getSocketFromFD',
  'getSocketAddress',
  'FS_unlink',
  'FS_mkdirTree',
  '_setNetworkCallback',
  'heapObjectForWebGLType',
  'toTypedArrayIndex',
  'webgl_enable_ANGLE_instanced_arrays',
  'webgl_enable_OES_vertex_array_object',
  'webgl_enable_WEBGL_draw_buffers',
  'webgl_enable_WEBGL_multi_draw',
  'webgl_enable_EXT_polygon_offset_clamp',
  'webgl_enable_EXT_clip_control',
  'webgl_enable_WEBGL_polygon_mode',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'colorChannelsInGlTextureFormat',
  'emscriptenWebGLGetTexPixelData',
  'emscriptenWebGLGetUniform',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  '__glGetActiveAttribOrUniform',
  'writeGLArray',
  'registerWebGlEventCallback',
  'runAndAbortIfError',
  'ALLOC_NORMAL',
  'ALLOC_STACK',
  'allocate',
  'writeStringToMemory',
  'writeAsciiToMemory',
  'setErrNo',
  'demangle',
  'stackTrace',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)

var unexportedSymbols = [
  'run',
  'addOnPreRun',
  'addOnInit',
  'addOnPreMain',
  'addOnExit',
  'addOnPostRun',
  'addRunDependency',
  'removeRunDependency',
  'out',
  'err',
  'abort',
  'wasmMemory',
  'wasmExports',
  'writeStackCookie',
  'checkStackCookie',
  'intArrayFromBase64',
  'tryParseAsDataURI',
  'convertI32PairToI53Checked',
  'stackSave',
  'stackRestore',
  'stackAlloc',
  'ptrToString',
  'zeroMemory',
  'exitJS',
  'getHeapMax',
  'growMemory',
  'ENV',
  'ERRNO_CODES',
  'strError',
  'DNS',
  'Protocols',
  'Sockets',
  'timers',
  'warnOnce',
  'readEmAsmArgsArray',
  'jstoi_s',
  'handleException',
  'keepRuntimeAlive',
  'asyncLoad',
  'alignMemory',
  'mmapAlloc',
  'wasmTable',
  'noExitRuntime',
  'getCFunc',
  'freeTableIndexes',
  'functionsInTableMap',
  'setValue',
  'getValue',
  'PATH',
  'PATH_FS',
  'UTF8Decoder',
  'UTF8ArrayToString',
  'UTF8ToString',
  'stringToUTF8Array',
  'stringToUTF8',
  'lengthBytesUTF8',
  'intArrayFromString',
  'UTF16Decoder',
  'stringToUTF8OnStack',
  'writeArrayToMemory',
  'JSEvents',
  'specialHTMLTargets',
  'findCanvasEventTarget',
  'currentFullscreenStrategy',
  'restoreOldWindowedStyle',
  'UNWIND_CACHE',
  'ExitStatus',
  'doReadv',
  'doWritev',
  'initRandomFill',
  'randomFill',
  'promiseMap',
  'uncaughtExceptionCount',
  'exceptionLast',
  'exceptionCaught',
  'Browser',
  'getPreloadedImageData__data',
  'wget',
  'MONTH_DAYS_REGULAR',
  'MONTH_DAYS_LEAP',
  'MONTH_DAYS_REGULAR_CUMULATIVE',
  'MONTH_DAYS_LEAP_CUMULATIVE',
  'SYSCALLS',
  'preloadPlugins',
  'FS_createPreloadedFile',
  'FS_modeStringToFlags',
  'FS_getMode',
  'FS_stdin_getChar_buffer',
  'FS_stdin_getChar',
  'FS_createPath',
  'FS_createDevice',
  'FS_readFile',
  'FS',
  'FS_createDataFile',
  'FS_createLazyFile',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'miniTempWebGLIntBuffers',
  'GL',
  'AL',
  'GLUT',
  'EGL',
  'GLEW',
  'IDBStore',
  'SDL',
  'SDL_gfx',
  'allocateUTF8',
  'allocateUTF8OnStack',
  'print',
  'printErr',
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);



var calledRun;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};

function callMain(args = []) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  var entryFunction = _main;

  args.unshift(thisProgram);

  var argc = args.length;
  var argv = stackAlloc((argc + 1) * 4);
  var argv_ptr = argv;
  args.forEach((arg) => {
    HEAPU32[((argv_ptr)>>2)] = stringToUTF8OnStack(arg);
    argv_ptr += 4;
  });
  HEAPU32[((argv_ptr)>>2)] = 0;

  try {

    var ret = entryFunction(argc, argv);

    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  }
  catch (e) {
    return handleException(e);
  }
}

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

function run(args = arguments_) {

  if (runDependencies > 0) {
    return;
  }

  stackCheckInit();

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    preMain();

    Module['onRuntimeInitialized']?.();

    if (shouldRunNow) callMain(args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(() => {
      setTimeout(() => Module['setStatus'](''), 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
  checkStackCookie();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
    // also flush in the JS FS layer
    ['stdout', 'stderr'].forEach((name) => {
      var info = FS.analyzePath('/dev/' + name);
      if (!info) return;
      var stream = info.object;
      var rdev = stream.rdev;
      var tty = TTY.ttys[rdev];
      if (tty?.output?.length) {
        has = true;
      }
    });
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.');
  }
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;

if (Module['noInitialRun']) shouldRunNow = false;

run();

// end include: postamble.js

