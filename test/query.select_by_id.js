import _ from 'underscore';
import test from 'tape';


import {
    Component, Entity, EntitySet,
    Query,
    initialiseRegistry, 
    loadEntities, 
    loadComponents,
    loadFixtureJSON,
    printE,
    printIns,
    logEvents,
    requireLib,
} from './common';


test('return entity by id', t => {
    initialiseEntitySet().then( ([registry,entitySet]) => {
        let result = entitySet.selectById( 5 );
        t.ok( EntitySet.isEntitySet(result) );
        t.equals( result.size(), 1 );
        t.end();
    });
});

test('return entities by id', t => {
    initialiseEntitySet().then( ([registry,entitySet]) => {
        let result = entitySet.selectById( [5, 6, 7] );
        t.ok( EntitySet.isEntitySet(result) );
        t.equals( result.size(), 3 );
        t.end();
    });
});

test('return entity by id in an array', t => {
    initialiseEntitySet().then( ([registry,entitySet]) => {
        let result = entitySet.selectById( 5, false );
        t.notOk( EntitySet.isEntitySet(result) );
        t.equals( result.length, 1 );
        t.end();
    });
});

test('.query returns an entityset of entities', t => {
    initialiseEntitySet().then( ([registry,entitySet]) => {
        // var result = entitySet.where('/component/name');
        let result = entitySet.query( Query.selectById( [3,4] ) );
        t.ok( result.isEntitySet, 'the result is an entityset');
        t.equals( result.length, 2, '2 entities returned');

        t.end();
    });
});

test('returns entities from the root entitySet', t => {
    initialiseEntitySet().then( ([registry,entitySet]) => {
        let subset;
        subset = entitySet.query( [
            Query.all('/component/channel'),
            // set the 2nd arg to true means that the root entityset will be selected
            Query.selectById([ 16,17,18 ], true)
            ]);
        t.equals( subset.length, 3, 'three entities selected' );
        

        subset = entitySet.query( [
            Query.all('/component/channel'),
            // this time, select works from the current selected context, which means
            // the supplied argument will be invalid
            Query.selectById([ 15,16,17 ])
            ]);
        // printE( subset );
        t.equals( subset.length, 0, 'no entities selected' );
        
    })
    .then( () => t.end() )
    .catch( err => log.error('test error: %s', err.stack) )
});


test('will use the previous result if an argument isnt supplied', t => {
    initialiseEntitySet().then( ([registry,entitySet]) => {
        let result = entitySet.query([
            Query.all('/component/channel_member'),
            Query.pluck('/component/channel_member', 'channel'),
            Query.selectById()
        ]);
        // printE( result );
        t.equals( result.length, 3 );
    })
    .then( () => t.end() )
    .catch( err => log.error('test error: %s', err.stack) )
});


function initialiseEntitySet( entityDataName = 'query.entities' ){
    return initialiseRegistry(false).then( registry => {
        let entitySet = loadEntities( registry, entityDataName );
        return [registry,entitySet];
    });
}
