import { SType, StackError, AsyncInstResult } from "../types";
import { unpackStackValue, unpackStackValueR, stackToString } from "../util";
import { isObject } from "../../util/is";
import { isStackValue, QueryStack } from "../stack";
import Jsonpointer from 'jsonpointer';
import { isComponent } from "../../component";
import { isEntity } from "../../entity";


export async function onPluck(stack: QueryStack): AsyncInstResult {

    // console.log('[onPluck]', stackToString(stack) );

    let right = stack.pop();
    let left = stack.pop();

    let key = unpackStackValueR(right, SType.Any);
    let list = unpackStackValue(left, [SType.List, SType.Map, SType.Component, SType.Entity]);

    if (isObject(list)) {
        list = [[SType.Map, list]];
    }

    // console.log('[onPluck]', {key}, {list});

    let out:any[] = [];
    if (Array.isArray(key)) {
        
        for( const it of list ){
            let obj = unpackStackValue(it);
            
            if (!isObject(obj)) {
                throw new StackError(`expected map, got ${it[0]}`);
            }

            // console.log( '[onPluck]', 'well', key, Object.keys(obj) );

            let result = {};
            for( const ptr of key ){
                // console.log('[onPluck]', 'set', ptr, obj, Jsonpointer.get(obj,ptr) );
                Jsonpointer.set(result, ptr, Jsonpointer.get(obj,ptr) );
                // console.log('set', result);
            }
            // const val = Object.keys(obj).filter(k => key.indexOf(k) !== -1)
            //     .reduce((acc, key) => Object.assign(acc, { [key]: obj[key] }), {});

            out.push( [SType.Map, result] );
        }
    }
    else {
        

        for( const it of list ){
            let obj = unpackStackValue(it);
            if (!isObject(obj)) {
                throw new StackError(`expected map, got ${it[0]}`);
            }
            let val = Jsonpointer.get(obj,key);
            // console.log('[onPluck]', 'get', key, obj, val );
            if( isStackValue(val) === false ){
                if( isComponent(val) ){
                    val = [SType.Component,val];
                } else if( isEntity(val) ){
                    val = [SType.Entity,val];
                } else {
                    val = [SType.Value,val];
                }
            }
            out.push(val);
            // out.push( isStackValue(val) ? val : [SType.Value, val] );
        }

        if( out.length === 1 && !Array.isArray(key) ){
            return out[0];
        }
    }

    // console.log('[onPluck]', out);
    return [SType.List, out];
}
