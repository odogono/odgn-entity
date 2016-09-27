import _ from 'underscore';
import test from 'tape';
import {Events} from 'odgn-backbone-model';
import Sinon from 'sinon';


import {
    Component, Entity, EntityFilter, EntitySet,
    Registry, Query, SchemaRegistry,
    initialiseRegistry, 
    loadEntities, 
    loadComponents,
    loadFixtureJSON,
    printE,
    printIns,
    logEvents,
    requireLib,
    getEntityIdFromId,
    getEntitySetIdFromId,
    setEntityIdFromId,
} from './common';

import CmdBuffer from '../src/cmd_buffer/async';

test('adding a component with no entity id', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry);
        let com = createComponent();

        return cb.addComponent( es, com )
            .then(added => {
                reportUpdates( t, es, 1, 0, 0, 1, 0, 0 );
            })
            .then( () => t.end() )
            
        })
        .catch( err => log.error('test error: %s', err.stack) )
});

test('adding a component with an eid, but not a member of the es', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry,50);
        let com = createComponent( {'@e':10} );

        return cb.addComponent( es, com )
            .then(added => {
                reportUpdates( t, es, 1, 0, 0, 1, 0, 0 );
            })
        })
        .then( () => t.end() )
        .catch( err => log.error('test error: %s', err.stack) )
});

test('adding a component with an eid, a non-member of the es', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry,50);
        let com = createComponent( {'@e':11, '@es':50} );

        return cb.addComponent( es, com )
            .then( added => {
                reportUpdates( t, es, 1, 0, 0, 1, 0, 0 );
                // t.equal( es.entitiesAdded.length, 1, 'one entity should be added' );
                // t.equal( es.componentsAdded.length, 1, 'one component should be added' );
                t.ok( Component.isComponent(added) );

            })
        })
        .then( () => t.end() )
        .catch( err => log.error('test error: %s', err.stack) )
});


test('adding a component with an eid, an existing member of the es', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry, 50, [11] );
        let com = createComponent( {'@e':11, '@es':50} );

        return cb.addComponent( es, com )
            .then( added => {
                reportUpdates( t, es, 0, 1, 0, 1, 0, 0 );
                t.ok( Component.isComponent(added) );
            })
        })
        .then( () => t.end() )
        .catch( err => log.error('test error: %s', err.stack) )
});


test('updating an existing component', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry, 50, [11] );
        let com = createComponent( {'@e':11, '@es':50} );

        es.getEntity = function(entityId){
            let e = registry.createEntityWithId(entityId);
            e.hasComponent = () => true;
            return Promise.resolve(e);
        }
        return cb.addComponent( es, com )
            .then( added => {
                reportUpdates( t, es, 0, 1, 0, 0, 1, 0 );

                // t.equal( es.entitiesUpdated.length, 1, 'one entity should be updated' );
                // t.equal( es.componentsUpdated.length, 1, 'one component should be updated' );
                t.ok( Component.isComponent(added) );
            })
        })
        .then( () => t.end() )
        .catch( err => log.error('test error: %s', err.stack) )
});

test('adding an entity with multiple components', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry,60);
        let e = registry.createEntity();
        
        let coms = createComponent({tag:'soft','@s':3},{tag:'hard','@s':10});
        
        //add created coms to created entity
        _.each( coms, com => e.addComponent(com) );

        return cb.addEntity( es, e)
            .then( added => reportUpdates(t, es, 1, 0, 0, 2, 0, 0) )
        })
        .then( () => t.end() )
        .catch( err => log.error('test error: %s', err.stack) ) 
});

test('updating an entity with a new component', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry,62, [10]);
        let e = registry.createEntityWithId(10,62);
        let coms = createComponent({tag:'soft','@s':3},{tag:'hard','@s':10});
        _.each( coms, com => e.addComponent(com) );
        // printIns( e.getComponentBitfield().toString() );


        es.getEntity = function(entityId){
            // let e = createEntity(entityId);
            e.hasComponent = (cIId) => {
                return (cIId.getDefId() === 3);
            };
            return Promise.resolve(e);
        }

        return cb.addEntity( es, e )
            .then( added => {
                reportUpdates( t, es, 0, 1, 0, 1, 1, 0 );
                // t.equal( es.entitiesAdded.length, 0, 'no entities should be added');
                // t.equal( es.entitiesUpdated.length, 1, 'one entity should be updated');
                // t.equal( es.componentsAdded.length, 1, 'one component should be added');
                // t.equal( es.componentsUpdated.length, 1, 'one component should be updated' );
            })
        })
        .then( () => t.end() )
        .catch( err => log.error('test error: %s', err.stack) )
});


test('removing a component from an entity', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry,63, [12]);
        let e = registry.createEntityWithId(12,63);
        let coms = createComponent({tag:'soft','@s':4},{tag:'hard','@s':10},{tag:'kik','@s':13});
        _.each( coms, com => e.addComponent(com) );
        // printIns( e.getComponentBitfield().toString() );

        es.getEntity = function(entityId){
            // let e = createEntity(entityId);
            e.hasComponent = (cIId) => true;
            return Promise.resolve(e);
        }

        return cb.removeComponent( es, coms[1] )
            .then( added => {
                reportUpdates( t, es, 0, 1, 0, 0, 0, 1 );
            })
        })
        .then( () => t.end() )
        .catch( err => log.error('test error: %s', err.stack) )
});

test('removing the last component from an entity', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry,63, [12]);
        let e = registry.createEntityWithId(12,63);
        let com = createComponent({tag:'soft','@s':4});
        
        e.addComponent(com);

        es.getEntity = function(entityId){
            e.hasComponent = (cIId) => true;
            return Promise.resolve(e);
        }

        return cb.removeComponent( es, com )
            .then( added => {
                reportUpdates( t, es, 0, 0, 1, 0, 0, 1 );
            })
        })
        .then( () => t.end() )
        .catch( err => log.error('test error: %s', err.stack) )
});



test('removing all components from an entity', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry,63, [12]);
        let e = registry.createEntityWithId(12,63);
        let coms = createComponent({tag:'soft','@s':4},{tag:'hard','@s':10},{tag:'kik','@s':13});
        _.each( coms, com => e.addComponent(com) );
        // printIns( e.getComponentBitfield().toString() );

        es.getEntity = function(entityId){
            e.hasComponent = (cIId) => true;
            return Promise.resolve(e);
        }

        return cb.removeComponent( es, coms )
            .then( added => {
                reportUpdates( t, es, 0, 0, 1, 0, 0, 3 );
                // t.equal( es.entitiesUpdated.length, 0, 'no entities should be updated');
                // t.equal( es.entitiesRemoved.length, 1, 'one entitiy should be removed');
                // t.equal( es.componentsUpdated.length, 0, 'no components should be updated');
                // t.equal( es.componentsRemoved.length, 3, 'three components should be removed');
            })
        })
        .then( () => t.end() )
        .catch( err => log.error('test error: %s', err.stack) )
});


test('removing an existing entity', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry,64, [13]);
        let e = registry.createEntityWithId(13,64);
        let coms = createComponent({tag:'soft','@s':4},{tag:'hard','@s':10},{tag:'kik','@s':13});
        _.each( coms, com => e.addComponent(com) );
        // printIns( e.getComponentBitfield().toString() );

        es.getEntity = function(entityId){
            // let e = createEntity(entityId);
            e.hasComponent = (cIId) => true;
            // e.hasComponent = (cIId) => {
            //     return (cIId.getDefId() === 3);
            // };
            return Promise.resolve(e);
        }

        return cb.removeEntity( es, e )
            .then( added => {
                reportUpdates( t, es, 0, 0, 1, 0, 0, 3 );
            })
        })
        .then( () => t.end() )
        .catch( err => log.error('test error: %s', err.stack) )
});

test('adding multiple', t => {
    return initialiseRegistry().then( registry => {
        let cb = new CmdBuffer();
        let es = createEntitySet(registry,66);
        let data = [
            {"@e":1, "@c": "/component/channel", '@s':1, "name":"ecs" },
            {"@e":1, "@c": "/component/topic", '@s':2, "topic": "Entity Component Systems" },
            {"@e":5, "@c": "/component/username", '@s':3, "username":"aveenendaal"},
            {"@e":5, "@c": "/component/nickname", '@s':4, "nickname":"alex"},
            {"@e":12, "@c": "/component/channel_member", '@s':5, "channel": 1, "client": 5 },
        ];

        let entities = registry.createEntitySet(null, {'@e':data});
        // let entities = loadEntities( registry, data );
        
        return cb.addEntity( es, entities.models )
            .then( added => {
                reportUpdates( t, es, 3, 0, 0, 5, 0, 0 );
            })
            .then( () => t.end() )
    })
    .catch( err => log.error('test error: %s', err.stack) )
});


function reportUpdates( t, es, eAdded, eUpdated, eRemoved, cAdded, cUpdated, cRemoved ){
    t.equal( es.entitiesAdded.length, eAdded, eAdded + ' entities should be added');
    t.equal( es.entitiesUpdated.length, eUpdated, eUpdated + ' entities should be updated');
    t.equal( es.entitiesRemoved.length, eRemoved, eRemoved + ' entity should be removed');
    t.equal( es.componentsAdded.length, cAdded, cAdded + ' components should be added');
    t.equal( es.componentsUpdated.length, cUpdated, cUpdated + ' components should be updated');
    t.equal( es.componentsRemoved.length, cRemoved, cRemoved + ' components should be removed');
}

/**
*   Creates a Mock ES that we can assert against
*/
function createEntitySet(registry, entitySetId, entityIds){
    entityIds = _.map( entityIds, id => setEntityIdFromId(id,entitySetId) );
    return _.extend({
        id: entitySetId,
        update: function( eAdd, eUp, eRem, cAdd, cUp, cRem ){
            // printIns( arguments, 1 );
            [this.entitiesAdded,
            this.entitiesUpdated,
            this.entitiesRemoved,
            this.componentsAdded,
            this.componentsUpdated,
            this.componentsRemoved] = arguments;
            return Promise.resolve(true);
        },
        getEntity: function( entityId, options ){
            if( entityIds.indexOf(entityId) !== -1 ){
                return Promise.resolve( registry.createEntityWithId(entityId) );
            }
            return Promise.resolve({});
        },
        getRegistry: function(){
            return registry;
        }
    }, Events );
}


/**
*   Creates a mock component
*/
function createComponent( attrs ){
    // let args = _.toArray(arguments);
    if( arguments.length > 1 ){
        return _.map( arguments, arg => {
            return createComponent.call(this,arg);
            } );
    }

    attrs = _.extend( {}, {'@s':1}, attrs );

    var result = Component.create( attrs, {parse:true} );
    
    return result;
}
