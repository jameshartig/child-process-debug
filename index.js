var child_process = require('child_process'),
    EventEmitter = require('events').EventEmitter;

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
    var port, i;
    for (i = argv.length - 1; i >= 0; i--) {
        if (typeof argv[i] === 'string' && argv[i].indexOf('--debug') !== -1) {
            port = parseInt(argv[i].substr(8), 10);
            if (!port) {
                port = 5858;
            }
            break;
        }
    }
    return [port, i];
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
function wrapSpawn(/*file , args, options*/) {
    var argsIndex = 1,
        file = arguments[0],
        args, options, debugPort, child;
    if (typeof file !== 'string') {
        file = process.execPath;
        argsIndex = 0;
    }
    if (Array.isArray(arguments[argsIndex])) {
        args = arguments[argsIndex];
        options = arguments[argsIndex + 1];
    } else {
        //only passed in options
        args = [];
        options = arguments[0];
    }
    debugPort = incrementDebugPort({args: args});
    if (debugPort) {
        //if there's already a debug port then don't overwrite it
        if (!_getDebugPort(args)[0]) {
            args.unshift('--debug=' + debugPort);
        }
    }
    //in case they add more params in the future, concat new args on
    child = child_process.spawn.apply(child_process, [file, args, options].concat(Array.prototype.slice.call(arguments, 3)));
    if (child instanceof EventEmitter) {
        child.debugPort = debugPort || _getDebugPort(args)[0];
    }
    return child;
}

exports.port = function() {
    return _getDebugPort(process.execArgv)[0];
};
exports.spawn = wrapSpawn;
exports.nextPort = incrementDebugPort;

/*
exports.setInfo = setChildInfo;
exports.getInfo = getChildInfo;
*/
