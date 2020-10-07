import Jsonpointer from 'jsonpointer';
import { EntityId, getEntityId, isEntity } from "../entity";
import {
    toComponentId,
    getComponentDefId,
    getComponentEntityId
} from "../component";
import { createLog } from "../util/log";
import { isRegex, isInteger, isString, isBoolean, isDate, isValidDate } from "../util/is";
import {
    BitField,
    create as createBitField,
    get as bfGet,
    set as bfSet,
    count as bfCount,
    and as bfAnd,
    or as bfOr,
    toValues as bfToValues,
    TYPE_AND,
    TYPE_OR,
    TYPE_NOT
} from "../util/bitfield";
import {
    isStackValue,
    entityIdFromValue,
    QueryStack,
} from "../query/stack";
import {
    SType,
    StackValue,
    InstResult, AsyncInstResult,
    StackError,
} from "../query/types";
import { onPluck } from "../query/words/pluck";
import { onDefine } from "../query/words/define";
import { ComponentDefId, getDefId, ComponentDef } from "../component_def";
import { onLogicalFilter, parseFilterQuery } from './filter';
import { unpackStackValue, unpackStackValueR, stackToString } from "../query/util";
import { EntitySetMem } from ".";
import { compareDates } from '../query/words/util';

const Log = createLog('ESMemQuery');


class ESMemQueryStack extends QueryStack {
    es: EntitySetMem
}


export interface SelectOptions {
    stack?: QueryStack;
}
/**
 * 
 * @param es 
 * @param query 
 */
export async function select(stack:QueryStack, query: StackValue[], options:SelectOptions = {}): Promise<StackValue[]> {
    
    stack.setChild();
    
    // add first pass words
    stack.addWords([
        ['!bf', buildBitfield, SType.List],
        ['!bf', buildBitfield, SType.Value],
        ['!ca', onComponentAttr],
        ['define', onDefine],

        ['and', onLogicalFilter, SType.Any, SType.Any],
        ['or', onLogicalFilter, SType.Any, SType.Any],
        ['not', onLogicalFilter, SType.Any, SType.Any],
        ['==', onLogicalFilter, SType.Any, SType.Any],
        ['!=', onLogicalFilter, SType.Any, SType.Any],
        ['>', onLogicalFilter, SType.Any, SType.Any],
        ['>=', onLogicalFilter, SType.Any, SType.Any],
        ['<', onLogicalFilter, SType.Any, SType.Any],
        ['<=', onLogicalFilter, SType.Any, SType.Any],
    ]);


    // Log.debug('[select]', query );

    await stack.pushValues(query);

    // reset stack items and words
    let items = stack.items;
    stack.clear();
    // stack.items = [];
    // stack.words = {};


    // Log.debug('[select]', items );

    stack.addWords([
        ['@e', fetchEntity],
        ['@eid', fetchEntity],
        ['@c', fetchComponents],
        ['!fil', applyFilter, SType.Filter],

        ['limit', applyLimit],
        ['pluck', onPluck],
    ]);

    // make sure any filter values have a following cmd
    items = items.reduce((result, value, ii, items) => {
        result.push(value);
        if (value[0] === SType.Filter) {
            result.push('!fil');
        }
        return result;
    }, []);

    await stack.pushValues(items);
    
    let result = stack.items;
    // Log.debug('pushing ', result);

    stack.restoreParent();
    
    return result;
}


function readEntityIds( stack:ESMemQueryStack ): EntityId[] {
    const { es } = stack;

    let bf = stack.popBitFieldOpt();
    let eids = matchEntities(es, undefined, bf);

    // Log.debug('[readEntityIds]', eids);

    // default to all of the entity ids
    return eids;
}


/**
 * 
 * @param stack 
 */
export function applyFilter(stack: ESMemQueryStack): InstResult {
    let filter;
    const { es } = stack;
    [, filter] = stack.pop();

    // determine whether the previous stack argument can give us
    // a set of eids. if not, then the filter is applied to all the entities
    // in the es
    let eids = readEntityIds(stack);

    // DLog(stack._root, 'bugger', filter);
    // ilog(stack.peek());
    let result = parseFilterQuery(es, filter[0], filter[1], filter[2]);
    // Log.debug('[applyFilter]', result);
    // Log.debug('[applyFilter]', Array.from(es.entities.keys()) );

    eids = walkFilterQuery(es, eids, ...result).sort();
    // Log.debug('[applyFilter]', 'result eids', eids );

    return [SType.List, eids.map(eid => [SType.Entity, eid])];
}

function walkFilterQuery(es: EntitySetMem, eids: EntityId[], cmd?, ...args) {
    if (cmd === 'and') {
        let left = walkFilterQuery(es, eids, ...args[0]);
        if (left === undefined || left.length === 0) {
            return left;
        }

        // if there are no results, then return
        let right = walkFilterQuery(es, left, ...args[1]);
        return right;
    }
    else if (cmd === 'or') {
        let left = walkFilterQuery(es, eids, ...args[0]);
        let right = walkFilterQuery(es, eids, ...args[1]);

        // merge the results and return
        return [...new Set([...left, ...right])];
    }

    switch (cmd) {
        case '==':
        case '!=':
        case '>':
        case '>=':
        case '<':
        case '<=':
            return walkFilterQueryCompare(es, eids, cmd, ...args);
        default:
            console.log('[walkFQ]', `unhandled ${cmd}`);
            return eids;

    }
}


function walkFilterQueryCompare(es: EntitySetMem, eids: EntityId[], cmd?, ...args) {
    let { def } = args[0];
    const did = getDefId(def);
    let [ptr, val] = args[1];

    eids = matchEntities(es, eids, createBitField([did]));
    let out = [];
    for( const eid of eids ){
        const cid = toComponentId(eid, did);
        const com = es.components.get(cid);

        // console.log('[walk]', cmd, ptr, {}.toString.call(val) );

        let ptrVal;
        if (ptr.startsWith('/')) {
            ptrVal = Jsonpointer.get(com, ptr);
            // console.log('[walk]', ptr, com );
        } else {
            ptrVal = com[ptr];
        }

        // if( com[key] === val )
        // Log.debug('[walkFQ]','==', ptr, ptrVal, val );
        // Log.debug('[walkFQ]','==', key, val, com[key], com);
        // if the value is an array, we look whether it exists
        if (Array.isArray(val)) {
            out = val.indexOf(ptrVal) !== -1 ? [...out, eid] : out;
        }
        if( ptrVal === undefined ){

        }
        else if( isDate(val) ){
            const ptrDte = new Date(ptrVal);
            if( isValidDate(ptrDte) ){
                if( compareDates(cmd, ptrDte, val ) ){
                    // console.log('[walk]', cmd, ptrVal, val );
                    out = [...out, eid];
                }
            }
        }
        else if (isRegex(val)) {
            // console.log('[walkFQC]', ptrVal, val, val.test(ptrVal) );
            out = val.test(ptrVal) ? [...out, eid] : out;
        } else {

            // otherwise a straight compare
            out = ptrVal === val ? [...out, eid] : out;
        }
    }
    return out;
}

export function applyLimit(stack: ESMemQueryStack): InstResult {
    let limit = stack.pop();
    let offset = stack.pop();

    return undefined;
}

export function fetchValue(stack: ESMemQueryStack): InstResult {
    let arg: StackValue = stack.pop();
    let type = arg[0];
    let value;

    if (type === SType.List) {
        value = unpackStackValue(arg);
        value = value.map(v => [SType.Value, v]);
        value = [SType.List, value];
    }

    return value;
}




/**
 * first argument indicates which components should be fetched
 * 2nd argument is a list of entity ids
 * @param stack 
 */
export function fetchComponents(stack: ESMemQueryStack): InstResult {
    const { es } = stack;
    let left: StackValue;
    let eids: EntityId[];
    let dids: ComponentDefId[];
    let coms = [];

    // get the bitfield
    dids = stack.popBitField<ComponentDef>(false) as ComponentDefId[];
    
    // ilog(dids);

    left = stack.peek();

    if (left !== undefined) {
        let from = stack.pop();

        if (from[0] === SType.Entity) {
            eids = [unpackStackValueR(from)];
            // Log.debug('[fetchComponent]', 'fetching from entity', eids);

        } else if (from[0] === SType.List) {
            // Log.debug('[fetchComponent]', from[1]);          
            eids = from[1].map(it => {
                return isStackValue(it) ? getEntityId(it[1])
                    : isEntity(it) ? getEntityId(it) : undefined;
            }).
                filter(Boolean);
        } else {
            Log.debug('[fetchComponent]', 'unhandled', from);
        }
    }

    // Log.debug('[fetchComponent]', eids, dids );

    // if an empty eid array has been passed, then no coms can be selected
    if (eids !== undefined && eids.length === 0) {
        return [SType.List, coms];
    }

    // Log.debug('[fetchComponent]', eids, dids );


    if (dids !== undefined && dids.length > 0) {
        for (const [, com] of es.components) {
            if (dids.indexOf(getComponentDefId(com)) !== -1) {
                coms.push(com);
            }
        }
    } else {
        coms = Array.from(es.components.values());
    }

    if (eids !== undefined && eids.length > 0) {
        coms = coms.filter(com => eids.indexOf(getComponentEntityId(com)) !== -1);
    }

    // sort by entityId
    coms.sort((a, b) => a['@e'] - b['@e']);

    coms = coms.map(c => [SType.Component, c]);

    return [SType.List, coms];
}


/**
 * Builds a ComponentAttr value - [Bitfield,string]
 * 
 * @param es 
 * @param stack 
 */
export function onComponentAttr(stack: QueryStack): InstResult {
    const { es } = stack;

    let right: string = stack.popValue(0, false);


    const parts: RegExpExecArray = /^(\/.*)#(.*)/.exec(right);

    if (parts !== null) {
        let [, did, pointer] = parts;
        // console.log('wat', right, did,pointer );

        const bf = es.resolveComponentDefIds([did]);
        if (bfCount(bf) === 0) {
            throw new StackError(`def not found: ${did}`);
        }

        return [SType.ComponentAttr, [bf, pointer]];
    }

    throw new Error(`invalid component attr: #{right}`);

    // let left:StackValue = stack.pop();

    // let attr = unpackStackValue(right, SType.Value);
    // let dids = unpackStackValue(left, SType.Any);
    // dids = isString(dids) ? [dids] : dids;

    // let bf = es.resolveComponentDefIds(dids );

    // if( bfCount(bf) === 0 ){
    //     throw new StackError(`def not found: ${left}`);
    // }


    // return [SType.ComponentAttr, [bf, attr]];
    // return undefined;
}

export function buildBitfield(stack: QueryStack): InstResult {
    const { es } = stack;
    let arg: StackValue = stack.pop();

    let dids = unpackStackValueR(arg, SType.Any);
    dids = isString(dids) ? [dids] : dids;
    let bf = es.resolveComponentDefIds(dids);

    return [SType.BitField, bf];
}

/**
 * Fetches an entity instance
 * 
 * @param es 
 * @param stack 
 */
export async function fetchEntity(stack: ESMemQueryStack, [,op]:StackValue): AsyncInstResult {
    const { es } = stack;
    let data: StackValue = stack.pop();

    const type = data[0];
    let eid = unpackStackValueR(data, SType.Any);
    let bf: BitField;
    let eids: number[];

    // Log.debug('[fetchEntity]', 'eh?', type, eid, data);

    if (type === SType.BitField) {
        bf = eid as BitField;
        eids = matchEntities(es, undefined, bf);
    } else if (isInteger(eid)) {
        // Log.debug('[fetchEntity]', 'eid only', eid, isInteger(eid), typeof eid );
        let e = await es.getEntity(eid, false);
        // Log.debug('[fetchEntity]', es.entities);
        if (e === undefined) {
            return [SType.Value, false];
        }
        return [SType.Entity, eid];
    }
    else if (Array.isArray(eid)) {
        // Log.debug('[fetchEntity]', 'eid array');
        eids = eid;
    }
    else if (type === SType.List) {
        let arr = unpackStackValue(data, SType.List, false);
        eids = arr.map(row => entityIdFromValue(row)).filter(Boolean);
        // Log.debug('[fetchEntity]', 'unpack', eids);
    }
    else if (eid === 'all') {
        let ents = matchEntities(es, undefined, 'all');
        return [SType.List, ents];
    } else {
        throw new StackError(`@e unknown type ${type}`)
    }

    // Log.debug('[fetchEntity]', 'ok', eids);

    if( op === '@eid' ){
        return [SType.List, eids.map(eid => [SType.Value,eid])];
    }

    let ents = es.getEntitiesByIdMem(eids);
    let result = ents.filter(Boolean).map(e => [SType.Entity, e]);

    // let result = [];
    // for( const eid of eids ){
    //     const e = await es.getEntity(eid, false);
    //     result.push( e === undefined ? [SType.Value,false] : [SType.Entity,e] );
    // }

    return [SType.List, result];
}



export function matchEntities(es: EntitySetMem, eids: EntityId[], mbf: BitField | 'all'): EntityId[] {
    let matches: number[] = [];
    const isAll = mbf === 'all' || mbf === undefined || mbf.isAllSet;
    const type = isAll ? TYPE_AND : (mbf as BitField).type;
    let cmpFn = bfAnd;
    if( type === TYPE_OR ){
        cmpFn = bfOr;
    } else if( type === TYPE_NOT ){
        // cmpFn = bfNot;
    }
    if (isAll) {
        return eids !== undefined ? eids : Array.from(es.entities.keys());
    }
    if (eids === undefined) {
        // let es = from as EntitySetMem;
        for (let [eid, ebf] of es.entities) {
            if (cmpFn(mbf as BitField, ebf)) {
                matches.push(eid);
            }
        }
    } else {
        for (let ii = 0; ii < eids.length; ii++) {
            let eid = eids[ii];
            let ebf = es.entities.get(eid);
            if (cmpFn(mbf as BitField, ebf)) {
                matches.push(eid);
            }
        }
    }

    // sort ascending
    matches.sort();

    return matches;
}

function ilog(...args) {
    if (process.env.JS_ENV === 'browser') { return; }
    const util = require('util');
    console.log(util.inspect(...args, { depth: null }));
}