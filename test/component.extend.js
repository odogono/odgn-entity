import _ from 'underscore';
import test from 'tape';

import {
    Component, Entity, EntityFilter, EntitySet,
    Registry, Query,
    initialiseRegistry, 
    loadEntities, 
    loadComponents,
    loadFixtureJSON,
    printE,
    printIns,
    logEvents,
    requireLib,
} from './common';

import ComponentRegistry from '../src/schema/index';


const COMPONENT_DEFINITIONS = [
    { uri:'/component/name', properties:{ name:""} },
];




test('registering a custom component type', t => {

    const TestComponent = Component.extend({
        type: 'TestComponent',

        // preinitialize: function(attrs,options){
        //     console.log('TestComponent preinit');
        // },

        verify: function(){
            return true;
        }
    })

    const componentRegistry = ComponentRegistry.create();
    componentRegistry.register( COMPONENT_DEFINITIONS );

    // register the type first
    componentRegistry.register( TestComponent );
    
    componentRegistry.register( { 
        uri: '/component/example', 
        type:'TestComponent', 
        'properties': { name:'' } 
    });
    
    let component = componentRegistry.createComponent('/component/example');

    t.ok( component.isTestComponent );
    t.ok( component.verify() );
    
    let name = componentRegistry.createComponent('/component/name');

    t.ok( name.isComponent );

    t.end();
});

test('attempting to create an unregistered type', t => {

    const componentRegistry = ComponentRegistry.create();

    try {
        componentRegistry.register( { 
        uri: '/component/example', type:'TestComponent', 'properties': {name:''} });
    }catch( err ){
        t.equals(err.message,'could not find type TestComponent for def /component/example');
    }

    t.end();
});


test('the custom component is initialised when registered', t => {
    createRegistry().then( registry => {
        t.plan(1);

        const TestComponent = Component.extend({
            type: 'TestComponent',

            preinitialize: function(attrs,options){
                t.ok( options.registry, 'the registry is passed as an option' );
            }
        });

        registry.registerComponent( TestComponent );
    })
    .then( () => t.end() )
    .catch( err => console.error('test error', err, err.stack));
});


test('the custom component can supply properties', t => {
    const componentRegistry = ComponentRegistry.create();

    const TestComponent = Component.extend({
        type: 'TestComponent',
        properties:{
            maximum: 10
        }
    });

    componentRegistry.register( TestComponent );

    // note that the merging of properties happens at the point of
    // registration
    componentRegistry.register( { 
        uri: '/component/example', 
        type:'TestComponent', 
        'properties': { name:'tbd' } 
    });
    
    let component = componentRegistry.createComponent('/component/example');

    t.equals( component.get('maximum'), 10 );
    t.equals( component.get('name'), 'tbd' );

    t.end();
})


function createRegistry(){
    const registry = Registry.create();
    return registry.registerComponent(COMPONENT_DEFINITIONS).then(() => registry);
}