import _ from 'underscore';
import Sinon from 'sinon';
import test from 'tape';



import {
    Entity, EntityProcessor, Dispatch,
    initialiseRegistry, 
    loadEntities, 
    loadFixtureJSON,
    printE,
    stringify,
    logEvents,
    createLog,
    entityToString,
} from './common';

const Log = createLog('TestDispatch');


/**

A utility for executing processors.

The idea here is that processors are registered with a query, which decides which entities they
are given to process. Then when an entity is passed in, each of the matching processors executes with
it.

    * further directions

        - processors may have identical queries. cache the query so that it is only executed once

        - execute a given processor at a given time interval only - eg, execute once every n seconds

        - manage the prioritising of processor execution

        - when an entity is accepted by a query, cache it's signature (component bits) so that the
        next time it (or something similar) passes through, the query won't have to be run.
        this may not always work, because the query may be selecting on component attributes.

        - the dispatch works either by having each processor process each entity in the ES:

        procA - updates each e in the ES
        procB - updates each e in the ES
        ...

        OR by limiting the execution to the first entity in the ES. by using an execute limit.

        procA - updates the first e in the ES
        procB - updates the first e in the ES - if exists
        ...

        so that is two types of operation for processors:
        - an entityset view (based on the p. query) is prepared for the processor ahead of execution
        - (adhoc) the processor works on the entityset as is, evaluating each entity against its query.
*/


test('basic execution of a processor', t => {
    let dispatch = Dispatch.create();
    let executeCount = 0;

    const processor = createEntityProcessor(
        (entityArray, timeMs, options ) => executeCount++);

    const otherProcessor = createEntityProcessor( 
        (entityArray, timeMs, options ) => executeCount++);

    dispatch.addProcessor( processor );
    dispatch.addProcessor( otherProcessor );
    
    // register a second processor with no query
    let entity = new Entity();

    dispatch.execute( entity );

    t.equals( executeCount, 2);
    t.end();
});


test('will only execute processors which match', async t => {
    try{
    const registry = await initialiseRegistry();
    const dispatch = Dispatch.create(registry);
    let executeCount = 0;

    const processor = createEntityProcessor( 
        (entityArray, timeMs, options ) => executeCount++);

    const otherProcessor = createEntityProcessor( 
        (entityArray, timeMs, options ) => executeCount++);

    dispatch.addProcessor( processor, Q => Q.all('/component/hostname') );
    dispatch.addProcessor( otherProcessor, Q => Q.all('/component/username') );
    
    let entity = registry.createEntity( {'@c':'/component/username', username:'fred'} );
    
    dispatch.execute( entity );

    // only one processor matches the query
    t.equals( executeCount, 1);

    dispatch.execute( entity );
    t.equals( executeCount, 2);
    
    t.end();

    }catch(err){ Log.error(err.stack) }
});

test('executing a processor with a time interval', async t => {
    try{
    const registry = await initialiseRegistry();
    const dispatch = Dispatch.create(registry);
    let entity = registry.createEntity( {'@c':'/component/username'} );
    let executeCount = 0;

    const processor = createEntityProcessor( 
        (entityArray, timeMs, options ) => executeCount++);

    // executes every 1000ms
    dispatch.addProcessor( processor, null, {interval:1000});

    dispatch.execute(entity, 0);
    t.equals( executeCount, 1);

    dispatch.execute(entity, 100);
    t.equals( executeCount, 1, 'no further execution within interval');

    dispatch.execute(entity, 1000);
    t.equals( executeCount, 2, 'another execution now that interval expired');

    dispatch.execute(entity, 1900);
    t.equals( executeCount, 2);        
    
    t.end();
    }catch(err){ Log.error(err.stack) }
});

test('processors can have priority', async t => {
    try{
    const registry = await initialiseRegistry();
    const dispatch = Dispatch.create(registry);

    let entity = registry.createEntity( [{'@c':'/component/username'}]);
    let executeCount = 0;

    const procA = createEntityProcessor( 
        (entityArray, timeMs, options ) =>{ if(executeCount===1){executeCount++} });
    const procB = createEntityProcessor( 
        (entityArray, timeMs, options ) =>{ if(executeCount===0){executeCount++} });
    const procC = createEntityProcessor( 
        (entityArray, timeMs, options ) =>{ if(executeCount===2){executeCount++} });

    dispatch.addProcessor( procA, null, {priority:10} );
    dispatch.addProcessor( procB, null, {priority:100} );
    dispatch.addProcessor( procC );

    dispatch.execute( entity );
    t.equals( executeCount, 3, 'processors executed in order');
    
    t.end();
    }catch(err){ Log.error(err.stack) }
});

test('retrieving all the processors assigned to a query', async t => {
    try{
    const registry = await initialiseRegistry();
    const entitySet = registry.createEntitySet();
    const dispatch = Dispatch.create(entitySet);

    const a = createEntityProcessor();
    const b = createEntityProcessor();
    class ProcC extends EntityProcessor{
        entityFilter(){ return Q => Q.all('/component/username') }
    }

    dispatch.addProcessor( a, Q => Q.all('/component/username') );
    dispatch.addProcessor( b, Q => Q.none('/component/username') );
    dispatch.addProcessor( ProcC, Q => Q.all('/component/username') );

    const procs = dispatch.getProcessorsForQuery( Q => Q.all('/component/username') );
    t.equal(procs.length,2);
    
    t.end();
    }catch(err){ Log.error(err.stack) }
});



test('dispatch can modify the incoming entityset');

test('processors executing with promises');



function createEntityProcessor( onUpdate ){
    const result = EntityProcessor.create();
    result.onUpdate = onUpdate;
    return result;
}


// test('match on query', t => {

//     // register a processor with a query

//     // register a second processor with a different kind of query

//     // pass an entity with a particular component pattern

//     // only one of the processors should have executed

//     t.ok(false);
//     t.end(); 
// })


