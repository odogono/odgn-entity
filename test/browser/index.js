var _ = window._ = require('underscore');
var Backbone = window.Backbone = require('backbone');

var test = require('tape').test;
var report = require('browserify-tape-spec');

var _ = require('underscore');
var Path = require('path');
var Elsinore = window.Elsinore = require('elsinore');

console.log('Elsinore is ');
console.log( Elsinore );

require('./entity_set.indexeddb');

test.createStream().pipe(report('out'));