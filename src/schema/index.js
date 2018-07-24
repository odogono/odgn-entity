import { Base } from '../base';
import { Collection } from '../util/collection';
import { Component } from '../component';
import { Events } from '../util/events';
import { stringify } from '../util/stringify';

import { isComponent, isObject } from '../util/is';
import { createLog } from '../util/log';

import { propertyResult } from '../util/result';

import { ComponentDef } from '../component_def';

const Log = createLog('ComponentRegistry', false);

import {
    COMPONENT_CREATE,
    COMPONENT_DEF_ID,
    COMPONENT_DEFINITION_ADD,
    COMPONENT_DEFINITION_REMOVE,
    COMPONENT_TYPE_ADD
} from '../constants';


/**
 * 
 * @param {*} models 
 * @param {*} options 
 */
export function ComponentDefCollection( models, options={} ){
    Collection.prototype.initialize.call(this, models, options );
}

Object.assign( ComponentDefCollection.prototype, Collection.prototype,{
    getByHash(hash) {
        return this.find(cdef => cdef.hash() == hash);
    },

    getByUri(uri) {
        return this.find(cdef => cdef.getUri() == uri);
    }
});


ComponentDefCollection.prototype.model = ComponentDef;



/**
 * 
 * @param {*} definitions 
 * @param {*} options 
 */
export function ComponentRegistry(definitions, options={}){
    Object.assign(this, Events);
    this.initialize( definitions, options );
}


/**
 *
 */
Object.assign( ComponentRegistry.prototype, {

    initialize(definitions, options = {}) {
        this.registry = options.registry;
        this._componentIndex = 1;
        this._componentDefs = new ComponentDefCollection();
        this._componentDefByUri = new ComponentDefCollection(null, { idAttribute: 'uri' });
        this._componentTypes = {};
        if (definitions) {
            definitions.forEach(def => this.register(def));
        }
    },

    toJSON(options = {}) {
        return this._componentDefs.reduce((result, def) => {
            if (options.expanded) {
                result[def.id] = def;
            } else {
                result[def.id] = def.getUri();
            }
            return result;
        }, []);
    },

    /**
     * Returns the registered component defs as an array of def ids
     * to def uris
     */
    getComponentDefUris() {
        return this._componentDefs.reduce((result, def) => {
            result[def.id] = def.getUri();
            return result;
        }, []);
    },

    /**
     * Adds a component definition to the registry
     *
     * @param {*} def
     * @param {*} options
     */
    register(def, options = {}) {
        let componentDef;
        let throwOnExists = options.throwOnExists === void 0 ? true : options.throwOnExists;

        if (def.isComponentDef) {
            componentDef = def;
        } else if (Array.isArray(def)) {
            return def.map(d => this.register(d, options));
        } else if ( def.prototype && def.prototype.isComponent === true ){ // isComponent(def)) {
            const defOptions = { registering: true, registry: this.registry };
            let inst = new def(null, defOptions);
            const properties = propertyResult(inst, 'properties');
            if (properties) {
                def.properties = properties;
            }
            const type = propertyResult(inst, 'type');
            this._componentTypes[type] = def;
            this.trigger(COMPONENT_TYPE_ADD, type, def);

            const uri = propertyResult(inst, 'uri');
            if (uri) {
                this.register({ uri, type });
            }

            return def;
        } else if (!isObject(def) || !def.uri) {
            Log.error('def', typeof def, def);
            throw new Error('invalid component def: ' + stringify(def));
        } else {
            // Log.info('register', def, Object.keys(options), throwOnExists );
            componentDef = new ComponentDef({ ...def });
        }

        const existing = this.getComponentDef(componentDef.hash());

        if (existing) {
            if (throwOnExists) {
                // Log.debug('existing', JSON.stringify(existing));
                // Log.debug('incoming', JSON.stringify(def));
                // Log.debug( this._componentDefByUri.toJSON() );
                throw new Error('def ' + existing.getUri() + ' (' + existing.hash() + ') already exists');
            }
            return existing;
        }

        componentDef.id = this._componentIndex++;

        const type = componentDef.getType();

        if (type) {
            let ComponentType = this._componentTypes[type] || Component;

            // ensure we have this type registered
            if (!ComponentType) {
                if (throwOnExists) {
                    throw new Error(`could not find type ${type} for def ${componentDef.getUri()}`);
                } else {
                    return null;
                }
            }

            // if (ComponentType.properties) {
            def.properties = { ...ComponentType.properties, ...def.properties };

            componentDef = new ComponentDef({ ...def, id: componentDef.id });
            // }
        }

        // if( !componentDef.getUri() ){
        //     throw new Error(`invalid component def`);
        // }
        this._componentDefs.add(componentDef);

        this._componentDefByUri.remove(componentDef.getUri());
        this._componentDefByUri.add(componentDef);

        this.trigger(COMPONENT_DEFINITION_ADD, componentDef.getUri(), componentDef.hash(), componentDef);

        return componentDef;
    },

    /**
     * Removes a definition from the registry
     *
     * @param {*} def
     */
    unregister(def) {
        let componentDef = this.getComponentDef(def);
        if (!componentDef) {
            return null;
        }

        let removed = this._componentDefByUri.remove(componentDef.getUri(), true);

        this._componentDefs.remove(componentDef.id);

        this.trigger(COMPONENT_DEFINITION_REMOVE, componentDef.getUri(), componentDef.hash(), componentDef);

        return componentDef;
    },

    /**
     * Returns an array of the registered componentdefs
     *
     * @param {*} options
     */
    getComponentDefs(options = {}) {
        if (options.all) {
            return this._componentDefs.models;
        }
        return this._componentDefByUri.models;
    },

    /**
     * Creates a new component instance
     *
     * @param {*} defUri
     * @param {*} attrs
     * @param {*} options
     * @param {*} cb
     */
    createComponent(defUri, attrs, options = {}, cb) {
        let throwOnNotFound = options.throwOnNotFound === void 0 ? true : options.throwOnNotFound;
        if (cb) {
            throwOnNotFound = false;
        }
        // Log.debug('createComponent', defUri, attrs, options);
        let def = this.getComponentDef(defUri, { throwOnNotFound });

        if (!def) {
            if (cb) {
                return cb('could not find componentDef ' + defUri);
            }
            return null;
        }

        const type = def.getType();
        let ComponentType = type ? this._componentTypes[type] : Component;

        //

        if (attrs === void 0 && isObject(defUri)) {
            attrs = defUri;
        }

        // we create with attrs from the def, not properties -
        // since the properties describe how the attrs should be set
        const defAttrs = def.getAttrs();
        attrs = { ...defAttrs, ...attrs };

        // NOTE: no longer neccesary to pass parse:true as the component constructor calls component.parse
        const defOptions = def.options || {};
        const createOptions = { ...defOptions, registry: this.registry };
        let result = new ComponentType(attrs, createOptions);

        if (type) {
            result['is' + type] = true;
        }

        result.setDefDetails(def.id, def.getUri(), def.hash(), def.getName());

        this.trigger(COMPONENT_CREATE, result.defUri, result);

        // console.log('result:', result);
        if (cb) {
            return cb(null, result);
        }
        return result;
    },

    /**
     *
     * @param {*} defIDentifiers
     * @param {*} options
     */
    getIID(defIDentifiers, options = { throwOnNotFound: true }) {
        options.returnIDs = true;
        // defIDentifiers.push({ throwOnNotFound:true, returnIDs:true });
        return this.getComponentDef(defIDentifiers, options);
    },

    /**
     *
     * @param {*} identifiers
     * @param {*} options
     */
    getComponentDef(identifiers, options = {}) {
        let ii = 0,
            len = 0,
            cDef,
            ident;
        // const debug = options.debug === void 0 ? false : options.debug;
        const forceArray = options.forceArray === void 0 ? false : options.forceArray;
        const returnIDs = options.returnIDs === void 0 ? false : options.returnIDs;
        const throwOnNotFound = options.throwOnNotFound === void 0 ? false : options.throwOnNotFound;
        let result;

        identifiers = Array.isArray(identifiers) ? identifiers : [identifiers];

        for (ii = 0, len = identifiers.length; ii < len; ii++) {
            ident = identifiers[ii];

            if (isObject(ident)) {
                ident = ident.id || ident.hash || ident.uri || ident[COMPONENT_DEF_ID];
            }

            if (!ident) {
                continue;
            }

            cDef = this._componentDefByUri.get(ident);

            if (!cDef) {
                cDef = this._componentDefs.get(ident);
            }

            if (!cDef) {
                cDef = this._componentDefs.getByHash(ident);
            }

            if (!cDef) {
                cDef = this._componentDefs.findWhere({ uri: ident });
            }

            if (!cDef) {
                cDef = this._componentDefs.findWhere({ name: ident });
            }

            if (!cDef) {
                if (throwOnNotFound) {
                    throw new Error(`could not find componentDef '${ident}'`);
                }
                if (len === 1 && !forceArray) {
                    return null;
                }
                return null;
            }

            if (len === 1 && !forceArray) {
                if (returnIDs) {
                    return cDef.id;
                }
                return cDef;
            }

            if (!result) {
                result = [];
            }

            result.push(returnIDs ? cDef.id : cDef);
        }

        if (!result || (result.length === 0 && !forceArray)) {
            return undefined;
        }

        return result;
    },

    
});

ComponentRegistry.create = function(definitions, options = {}) {
    let result = new ComponentRegistry(definitions, options);

    return result;
}
