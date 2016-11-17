/* @flow */

import _ from 'underscore';
import Model from './model';
import {
    hash,
    setEntityIdFromId,
    stringify,
} from './util';

/**
 * Components contain data
 * @type {[type]}
 */
export default class Component extends Model {

    constructor(attrs,options){
        // console.log('Component.constructor', attrs);
        attrs = Component.prototype.parse.apply(null,[attrs]);
        super(attrs,options);
    }


    // preinitialize( attrs, options={} ){
        // console.log('preinit', attrs);
        // options.parse = true;
        // attrs.poo = true;
    //     if( options.registry ){
    //         this.registry = registry;
    //     }
    // }

    parse( resp ){
        // console.log('Component.parse', resp);
        var esId = 0, eId = 0;
        if( !resp || _.keys(resp).length <= 0 ){
            return resp;
        }
        if( resp['@es'] ){
            esId = resp['@es'];
            delete resp['@es'];
        }
        if( resp['@e'] ){
            eId = resp['@e'];
            // delete resp['@e'];
        }
        if( resp['@i'] ){
            resp.id = resp['@i'];
            delete resp['@i'];
        }

        if( esId || eId ){
            // log.debug('creating from ' + eId + ' ' + esId );
            resp['@e'] = setEntityIdFromId(eId, esId);
        }

        return resp;
    }

    /**
     * Applies the attributes of the first argument to this component
     */
    apply( other, options ){
        let attrs = other;
        if( Component.isComponent(other) ){
            attrs = other.attributes;
        }
        this.set( _.omit(attrs, '@e','@es','@s', '@c'), options );
    }

    get entityId(){ return this.attributes['@e']; }
    set entityId(id){ this.attributes['@e'] = id; }


    getEntityId(){
        return this.get('@e');
    }

    setEntityId(id, internalId){
        this.attributes['@e'] = id;
    }

    getDefId(){
        return this.attributes['@s'];// this.get('@s');
    }

    getDefUri(){
        return this.attributes['@c'];// return this.get('@c');
    }

    getUri(){
        return this.attributes['@c'];// return this.get('@c');
    }
    // setDefHash: function(hash:string){
    //     this._defHash = hash;
    // },
    getDefHash(){
        return this._defHash;
    }

    getDefName(){
        return this._defName;
    }
    
    // setDefName: function(name:string){
    //     this.name = this._defName = name;
    // },
    setDefDetails( defId, uri: string, hash:string, name:string ){
        this.set({'@s':defId,'@c':uri});
        this._defHash = hash;
        this.name = this._defName = name;  
    }
    
    /**
     * 
     */
    hash(asString){
        let result = stringify(  _.omit(this.attributes, '@e','@es','@s', '@c') );
        return hash( result, asString );
    }

    /**
     * 
     */
    toJSON(options){
        let result = _.omit(this.attributes,'@e','@es', '@c', 'id');
        if( !_.isUndefined(this.id) ){
            result[Component.ID] = this.id;
        }
        if( this.entityId > 0 ){
            result['@e'] = this.entityId;
        }
        
        if( options && options.cdefMap ){
            result['@c'] = options.cdefMap[result['@s']];
            delete result['@s'];
        }
        return result;
    }

}

Component.prototype.type = 'Component';
Component.prototype.isComponent = true;
Component.prototype.cidPrefix = 'c';


Component.isComponent = function(obj){
    return obj && obj.isComponent;
};

Component.ID = '@i';
Component.URI = '@c';
Component.DEF_ID = '@s';
Component.ENTITY_SET_ID = '@es';

