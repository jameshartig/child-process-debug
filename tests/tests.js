var child_process = require('child_process'),
    EventEmitter = require('events').EventEmitter,
    reload = require('require-reload')(require),
    childProcessDebug;

//this is for the testMyPortImmutable test
process.execArgv.push('--debug=1234');
childProcessDebug = reload('../debug.js');

function toggleDebugFlag(enabled, port, enabledBrk) {
    for (var i = process.execArgv.length - 1; i >= 0; i--) {
        if (process.execArgv[i].indexOf('--debug') !== -1) {
            if (enabled) {
                enabled = false;
                break;
            }
            process.execArgv.splice(i, 1);
        }
    }
    if (enabled) {
        if (port) {
            process.execArgv.push('--debug=' + port);
        } else {
            process.execArgv.push('--debug');
        }
        if (enabledBrk) {
            global.v8DebugBreak = true;
            process.execArgv.push('--debug-brk');
        } else {
            global.v8DebugBreak = false;
        }
    } else {
        global.v8DebugBreak = false;
    }
    //need to reload this EVERYTIME so it picks up our changes to execArgv as if we just started the process
    childProcessDebug = reload('../debug.js');
}

function hackSpawn(spawn) {
    //now were going to pollute the child_process cached require to do our testing
    reload.emptyCache();
    require.cache.child_process = {
        exports: {
            spawn: spawn
        }
    };
    return reload('../debug.js');
}

exports.testSpawnArgsCommon = function(test) {
    var file = 'test.js',
        args = [0, 1],
        options = {},
        child;

    toggleDebugFlag(false);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1].length, 2);
        test.strictEqual(arguments[2], options);
        return new EventEmitter();
    }).spawn(file, args, options);
    test.strictEqual(child.debugPort, undefined);

    toggleDebugFlag(true);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1].length, 3);
        test.strictEqual(arguments[2], options);
        return new EventEmitter();
    }).spawn(file, args, options);
    test.equal(child.debugPort, 5859);

    toggleDebugFlag(false);
    toggleDebugFlag(true, undefined, true);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1][1], '--debug-brk');
        test.equal(arguments[1].length, 4);
        test.strictEqual(arguments[2], options);
        return new EventEmitter();
    }).spawn(file, args, options);
    test.equal(child.debugPort, 5859);
    test.done();
};

exports.testSpawnArgsTwoBrks = function(test) {
    var file = 'test.js',
        args = ['--debug-brk', '--debug-brk'],
        child;

    toggleDebugFlag(false);
    toggleDebugFlag(true, undefined, true, true);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1][1], '--debug-brk');
        test.equal(arguments[1][2], '--debug-brk');
        test.equal(arguments[1].length, 3);
        return new EventEmitter();
    }).spawn(file, args);
    test.equal(child.debugPort, 5859);
    test.done();
};

exports.testSpawnArgsNoFile = function(test) {
    var file = process.execPath,
        args = [0, 1],
        options = {},
        child;

    toggleDebugFlag(false);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1].length, 2);
        test.strictEqual(arguments[2], options);
        return new EventEmitter();
    }).spawn(args, options);
    test.strictEqual(child.debugPort, undefined);

    toggleDebugFlag(true);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1].length, 3);
        test.strictEqual(arguments[2], options);
        return new EventEmitter();
    }).spawn(args, options);
    test.equal(child.debugPort, 5859);
    test.done();
};

exports.testSpawnArgsOnlyOptions = function(test) {
    var file = process.execPath,
        options = {},
        child;

    toggleDebugFlag(false);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1].length, 0);
        test.strictEqual(arguments[2], options);
        return new EventEmitter();
    }).spawn(options);
    test.strictEqual(child.debugPort, undefined);

    toggleDebugFlag(true);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1].length, 1);
        test.strictEqual(arguments[2], options);
        return new EventEmitter();
    }).spawn(options);
    test.equal(child.debugPort, 5859);
    test.done();
};

exports.testSpawnArgsOnlyFile = function(test) {
    var file = 'test.js',
        child;

    toggleDebugFlag(false);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1].length, 0);
        return new EventEmitter();
    }).spawn(file);
    test.strictEqual(child.debugPort, undefined);

    toggleDebugFlag(true);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1].length, 1);
        return new EventEmitter();
    }).spawn(file);
    test.equal(child.debugPort, 5859);
    test.done();
};

exports.testSpawnArgsOnlyArgs = function(test) {
    var file = process.execPath,
        args = [0, 1],
        child;

    toggleDebugFlag(false);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1].length, 2);
        return new EventEmitter();
    }).spawn(args);
    test.strictEqual(child.debugPort, undefined);

    toggleDebugFlag(true);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1].length, 3);
        return new EventEmitter();
    }).spawn(args);
    test.equal(child.debugPort, 5859);
    test.done();
};

exports.testSpawnIgnoreDebug = function(test) {
    var file = process.execPath,
        args = [0, '--debug=9999'],
        child;

    toggleDebugFlag(false);
    child = hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1].length, 2);
        return new EventEmitter();
    }).spawn(args);
    test.strictEqual(child.debugPort, 9999);

    toggleDebugFlag(true);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1][1], '--debug=9999');
        test.equal(arguments[1].length, 2);
        return new EventEmitter();
    }).spawn(args);
    test.equal(child.debugPort, 9999);

    toggleDebugFlag(false);
    toggleDebugFlag(true, undefined, true);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1][1], '--debug=9999');
        test.equal(arguments[1][2], '--debug-brk');
        test.equal(arguments[1].length, 3);
        return new EventEmitter();
    }).spawn(args);
    test.equal(child.debugPort, 9999);
    test.done();
};

exports.testSpawnFailure = function(test) {
    toggleDebugFlag(false);
    var child = hackSpawn(function() {
        return null;
    }).spawn();
    test.strictEqual(child, null);
    test.done();
};

exports.testNextPort = function(test) {
    toggleDebugFlag(false);
    test.strictEqual(childProcessDebug.nextPort(), undefined);

    toggleDebugFlag(true);
    test.strictEqual(childProcessDebug.nextPort(), 5859);

    toggleDebugFlag(false);
    toggleDebugFlag(true, 9999);
    test.strictEqual(childProcessDebug.nextPort(), 10000);
    test.done();
};

exports.testPort = function(test) {
    toggleDebugFlag(false);
    test.strictEqual(childProcessDebug.port(process.execArgv), undefined);

    toggleDebugFlag(true);
    test.strictEqual(childProcessDebug.port(process.execArgv), 5858);
    test.equal(childProcessDebug.debugBreak(process.execArgv), false);

    toggleDebugFlag(false);
    toggleDebugFlag(true, 9999);
    test.strictEqual(childProcessDebug.port(process.execArgv), 9999);
    test.equal(childProcessDebug.debugBreak(process.execArgv), false);
    test.done();
};

exports.testDebugBreak = function(test) {
    toggleDebugFlag(false);
    toggleDebugFlag(true, undefined, true);
    test.equal(childProcessDebug.port(process.execArgv), 5858);
    test.equal(childProcessDebug.debugBreak(process.execArgv), true);

    toggleDebugFlag(false);
    toggleDebugFlag(true, 9999, true);
    test.equal(childProcessDebug.port(process.execArgv), 9999);
    test.equal(childProcessDebug.debugBreak(process.execArgv), true);
    test.done();
};

exports.testMyPortImmutable = function(test) {
    toggleDebugFlag(false);
    process.execArgv.push('--debug=9999');
    process.execArgv.push('--debug-brk');
    //this *shouldn't* change the actual port that childProcessDebug reports, like ever
    test.equal(childProcessDebug.port(), 1234);
    test.equal(childProcessDebug.debugBreak(), false);
    test.done();
};

exports.testActualSpawnDebugging = function(test) {
    test.expect(2);
    reload.emptyCache(); //clear out any hacked spawns
    toggleDebugFlag(false);
    toggleDebugFlag(true, 15000);
    var child = childProcessDebug.spawn(['./tests/lib/spawn.js']),
        receivedDebugging = false;
    test.strictEqual(child.debugPort, 15001);

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(data) {
        if (data && data.toLowerCase().indexOf('debugger listening on port 15001') !== -1) {
            receivedDebugging = true;
        } else {
            console.log("spawn.js stderr: " + data);
        }
    });
    child.on('exit', function(code) {
        if (code !== 0) {
            console.log("spawn.js exited with code " + code);
        }
        test.ok(receivedDebugging);
        test.done();
    });
    //now we can trigger the child to die
    child.stdin.write("hey\n");
};

exports.testActualForkDebugging = function(test) {
    test.expect(2);
    reload.emptyCache(); //clear out any hacked spawns
    toggleDebugFlag(false);
    toggleDebugFlag(true, 15000);
    //without silent: true, the output will go out our stderr
    var child = childProcessDebug.fork('./tests/lib/spawn.js', {silent: true}),
        receivedDebugging = false;
    test.strictEqual(child.debugPort, 15001);

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(data) {
        if (data && data.toLowerCase().indexOf('debugger listening on port 15001') !== -1) {
            receivedDebugging = true;
        } else {
            console.log("spawn.js stderr: " + data);
        }
    });
    child.on('exit', function(code) {
        if (code !== 0) {
            console.log("spawn.js exited with code " + code);
        }
        test.ok(receivedDebugging);
        test.done();
    });
    //now we can trigger the child to die
    child.stdin.write("hey\n");
};

exports.testExitWithParent = function(test) {
    test.expect(2);
    reload.emptyCache(); //clear out any hacked spawns
    //without silent: true, the output will go out our stderr
    var child = childProcessDebug.fork('./tests/lib/spawn.js', {silent: true});
    process.removeAllListeners('SIGINT').once('SIGINT', function() {
        test.ok(true);
    });
    childProcessDebug.exitWithParent(child);
    child.on('exit', function() {
        process.removeAllListeners('SIGTERM');
        test.ok(true);
        test.done();
    });
    process.nextTick(function() {
        process.emit('SIGINT');
    });
};
