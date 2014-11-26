var _ = require('underscore');

var Fs = require('fs');
var Es = require('event-stream');
var Path = require('path');
var Util = require('util');


var rootDir = Path.join( Path.dirname(__filename), '../../' );
var fixtureDir = Path.join( rootDir, 'test', 'fixtures' );

var Elsinore = require( Path.join( rootDir ) );

function createFixtureReadStream( fixturePath ){
    var path = Path.join( fixtureDir, fixturePath );
    return Fs.createReadStream( path, { encoding: 'utf-8' })
        .pipe(Es.split())
        .pipe(Es.parse());
}

function loadFixture( fixturePath, data ){
    var path = Path.join( fixtureDir, fixturePath );
    return Fs.readFileSync( path, 'utf8');
}


function logEvents(obj){
    obj.on('all', function(evt){
        log.debug('evt ' + JSON.stringify( _.toArray(arguments) ) );
    });
}

function printIns(arg,depth,showHidden,colors){
    if( _.isUndefined(depth) ) depth = 2;
    var stack = __stack[1];
    var fnName = stack.getFunctionName();
    var line = stack.getLineNumber();
    // Util.log( fnName + ':' + line + ' ' + Util.inspect(arg,showHidden,depth,colors) );
    Util.log( Util.inspect(arg,showHidden,depth,colors) );
};

function printVar(){
    var i, len;
    for (i = 0, len = arguments.length; i < len; i++) {
        Util.log( JSON.stringify(arguments[i], null, '\t') );
    }
}

Object.defineProperty(global, '__stack', {
    get: function() {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

Object.defineProperty(global, '__line', {
    get: function() {
        return __stack[1].getLineNumber();
    }
});

Object.defineProperty(global, '__function', {
    get: function() {
        return __stack[1].getFunctionName();
    }
});

global.printIns = printIns;
global.printVar = printVar;
global.printE = function(e){
    Util.log( Elsinore.Registry.toString(e) );
}

global.log = {
    debug: console.log
};

module.exports = {
    printVar: printVar,
    printIns: printIns,
    logEvents: logEvents,
    createFixtureReadStream: createFixtureReadStream,
    loadFixture: loadFixture
}