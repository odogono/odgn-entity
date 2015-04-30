'use strict';

var _ = require('underscore');
var test = require('tape');

var Common = require('./common');
var Elsinore = require('../lib');
var Utils = Elsinore.Utils;


test('toPascalCase', function(t){
    var cases = {
        'good work': 'GoodWork',
        'good-job': 'GoodJob',
        'good    skills': 'GoodSkills',
        'good': 'Good',
        'GoodJobEveryone': 'GoodJobEveryone',
        'goodJobEveryone': 'GoodJobEveryone'
    };

    _.each( cases, function(expected,input){
        t.equals( Utils.toPascalCase(input), expected );
    });

    t.end();
});