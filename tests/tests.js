var child_process = require('child_process'),
    reload = require('require-reload')(require),
    childProcessDebug = reload('../index.js');

function toggleDebugFlag(enabled, port) {
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
    }
}

function hackSpawn(spawn) {
    //now were going to pollute the child_process cached require to do our testing
    reload.emptyCache();
    require.cache.child_process = {
        exports: {
            spawn: spawn
        }
    };
    return reload('../index.js');
}

exports.testSpawnArgsCommon = function(test) {
    var file = 'test.js',
        args = [0, 1],
        options = {};

    toggleDebugFlag(false);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1].length, 2);
        test.strictEqual(arguments[2], options);
    }).spawn(file, args, options);

    toggleDebugFlag(true);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1].length, 3);
        test.strictEqual(arguments[2], options);
    }).spawn(file, args, options);
    test.done();
};

exports.testSpawnArgsNoFile = function(test) {
    var file = process.execPath,
        args = [0, 1],
        options = {};

    toggleDebugFlag(false);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1].length, 2);
        test.strictEqual(arguments[2], options);
    }).spawn(args, options);

    toggleDebugFlag(true);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.strictEqual(arguments[1], args);
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1].length, 3);
        test.strictEqual(arguments[2], options);
    }).spawn(args, options);
    test.done();
};

exports.testSpawnArgsOnlyOptions = function(test) {
    var file = process.execPath,
        options = {};

    toggleDebugFlag(false);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1].length, 0);
        test.strictEqual(arguments[2], options);
    }).spawn(options);

    toggleDebugFlag(true);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1].length, 1);
        test.strictEqual(arguments[2], options);
    }).spawn(options);
    test.done();
};

exports.testSpawnArgsOnlyFile = function(test) {
    var file = 'test.js';

    toggleDebugFlag(false);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1].length, 0);
    }).spawn(file);

    toggleDebugFlag(true);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1].length, 1);
    }).spawn(file);
    test.done();
};

exports.testSpawnArgsOnlyArgs = function(test) {
    var file = process.execPath,
        args = [0, 1];

    toggleDebugFlag(false);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1].length, 2);
    }).spawn(args);

    toggleDebugFlag(true);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1][0], '--debug=5859');
        test.equal(arguments[1].length, 3);
    }).spawn(args);
    test.done();
};

exports.testSpawnIgnoreDebug = function(test) {
    var file = process.execPath,
        args = [0, '--debug=9999'];

    toggleDebugFlag(false);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1].length, 2);
    }).spawn(args);

    toggleDebugFlag(true);
    hackSpawn(function() {
        test.strictEqual(arguments[0], file);
        test.ok(Array.isArray(arguments[1]));
        test.equal(arguments[1][1], '--debug=9999');
        test.equal(arguments[1].length, 2);
    }).spawn(args);
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
    test.strictEqual(childProcessDebug.port(), undefined);

    toggleDebugFlag(true);
    test.strictEqual(childProcessDebug.port(), 5858);

    toggleDebugFlag(false);
    toggleDebugFlag(true, 9999);
    test.strictEqual(childProcessDebug.port(), 9999);
    test.done();
};

exports.testSpawnDebuggingEnabled = function(test) {
    test.expect(1);
    toggleDebugFlag(false);
    toggleDebugFlag(true, 15000);
    var child = childProcessDebug.spawn(['./tests/lib/spawn.js']),
        receivedDebugging = false;
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
