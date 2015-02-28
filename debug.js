var child_process = require('child_process'),
    EventEmitter = require('events').EventEmitter,
    myDebugBreak = global.v8DebugBreak,
    myDebugPort = global.v8DebugPort;

function setChildInfo(port, info) {
    if (global.debugChildProcesses === undefined) {
        global.debugChildProcesses = {};
    }
    global.debugChildProcesses[port] = info;
}

function getChildInfo(port) {
    if (global.debugChildProcesses === undefined) {
        return undefined;
    }
    return global.debugChildProcesses[port];
}

function _getDebugPort(argv) {
    var debugBreak = false,
        debugIndex = -1,
        port, i;
    for (i = argv.length - 1; i >= 0; i--) {
        if (typeof argv[i] !== 'string') {
            continue;
        }
        if (argv[i] === '--debug-brk') {
            debugBreak = true;
            continue;
        }
        if (debugIndex === -1 && argv[i].indexOf('--debug') !== -1) {
            port = parseInt(argv[i].substr(8), 10);
            if (!port) {
                port = 5858;
            }
            debugIndex = i;
        }
    }
    //todo: stop using an array for this and use an object...
    return [port, debugIndex, debugBreak];
}
//initially store the values we were run with in case someone changes them later or we increment them
if (myDebugPort === undefined) {
    myDebugPort = _getDebugPort(process.execArgv)[0];
    if (myDebugPort) {
        //store this globally so we always have a record of the initial debug port for this process
        global.v8DebugPort = myDebugPort;
    }
}
if (myDebugBreak === undefined) {
    myDebugBreak = _getDebugPort(process.execArgv)[2];
    global.v8DebugBreak = myDebugBreak;
}

function incrementDebugPort(info) {
    //start at end so we pick up the LAST debug statement
    var portAndIndex = _getDebugPort(process.execArgv),
        nextPort;
    if (portAndIndex[0]) {
        nextPort = portAndIndex[0] + 1;
        process.execArgv.splice(portAndIndex[1], 1, '--debug=' + nextPort);
        if (info !== undefined) {
            setChildInfo(nextPort, info);
        }
    }
    return nextPort;
}

//shove the --debug at the front of arguments
function wrapSpawnFork(method /*, file , args, options*/) {
    var argsIndex = 2,
        file = arguments[1],
        args, options, debugPort, child,
        argsPortBrk;
    if (typeof file !== 'string') {
        file = process.execPath;
        argsIndex = 1;
    }
    if (Array.isArray(arguments[argsIndex])) {
        args = arguments[argsIndex];
        options = arguments[argsIndex + 1];
    } else {
        args = [];
        options = arguments[argsIndex];
    }
    argsPortBrk = _getDebugPort(args);
    debugPort = incrementDebugPort({args: args});
    if (debugPort) {
        //only add --debug=port when they didn't already add one
        if (!argsPortBrk[0]) {
            args.unshift('--debug=' + debugPort);
            argsPortBrk[1] = 0;
        }
        if (!argsPortBrk[2] && myDebugBreak) {
            args.splice(argsPortBrk[1] + 1, 0, '--debug-brk');
        }
    }
    //in case they add more params in the future, concat new args on
    child = child_process[method].apply(child_process, [file, args, options].concat(Array.prototype.slice.call(arguments, 4)));
    if (child instanceof EventEmitter) {
        child.debugPort = debugPort || argsPortBrk[0];
    }
    return child;
}

exports.port = function(argv) {
    if (argv === undefined) {
        return myDebugPort;
    }
    return _getDebugPort(argv)[0];
};
exports.debugBreak = function(argv) {
    if (argv === undefined) {
        return myDebugBreak;
    }
    return _getDebugPort(argv)[2];
};
exports.spawn = function(file, args, options) {
    return wrapSpawnFork('spawn', file, args, options);
};
exports.exitWithParent = function(child) {
    if (typeof child.kill !== 'function') {
        throw new TypeError('Invalid child sent to exitWithParent');
    }
    process.on('exit', child.kill.bind(child));
    process.on('SIGTERM', child.kill.bind(child));
    process.on('SIGINT', child.kill.bind(child));
};
exports.fork = function(modulePath, args, options) {
    if (Array.isArray(modulePath)) {
        throw new TypeError('Missing modulePath for fork');
    }
    return wrapSpawnFork('fork', modulePath, args, options);
};
exports.nextPort = incrementDebugPort;

/*
exports.setInfo = setChildInfo;
exports.getInfo = getChildInfo;
*/
