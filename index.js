var child_process = require('child_process');

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

function _getDebugPort() {
    var port, i;
    for (i = process.execArgv.length - 1; i >= 0; i--) {
        if (process.execArgv[i].indexOf('--debug') !== -1) {
            port = parseInt(process.execArgv[i].substr(8), 10);
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
    var portAndIndex = _getDebugPort(),
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

//if there's already a debug port then don't overwrite it
function addDebugPortToArgs(args, port) {
    for (var i = 0, l = args.length; i < l; i++) {
        if (typeof args[i] === 'string' && args[i].indexOf('--debug') !== -1) {
            return;
        }
    }
    args.unshift('--debug=' + port);
}

//shove the --debug at the front of arguments
function wrapSpawn(/*file , args, options*/) {
    var argsIndex = 1,
        file = arguments[0],
        args, options, debugPort;
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
        addDebugPortToArgs(args, debugPort);
    }
    //in case they add more params in the future, concat new args on
    return child_process.spawn.apply(child_process, [file, args, options].concat(Array.prototype.slice.call(arguments, 3)));
}

exports.port = function() {
    return _getDebugPort()[0];
};
exports.spawn = wrapSpawn;
exports.nextPort = incrementDebugPort;

/*
exports.setInfo = setChildInfo;
exports.getInfo = getChildInfo;
*/
