import _ from 'underscore';
import Backbone from 'backbone';
import DeepEqual from 'deep-equal';
import Url from 'fast-url-parser';
import Util from 'util';

export const deepEqual = DeepEqual;

export function mergeRecursive(obj1, obj2) {
    for (let p in obj2) {
        if( obj2.hasOwnProperty(p) ){
            if( obj1 === undefined )
                obj1 = {};
            obj1[p] = (typeof obj2[p] === 'object') ? mergeRecursive(obj1[p], obj2[p]) : obj2[p];
        }
    }
    return obj1;
}


// 
// Returns an array broken into set lengths
// 
export function chunk( array, chunkLength ){
    let i,j,temparray;
    let result = [];
    for (i=0,j=array.length; i<j; i+=chunkLength) {
        result.push( array.slice(i,i+chunkLength) );
    }

    return result;
};

// taken from underscore-contrib/underscore.function.predicates
// cannot include directly in node

// A numeric is a letiable that contains a numeric value, regardless its type
// It can be a String containing a numeric value, exponential notation, or a Number object
// See here for more discussion: http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric/1830844#1830844
export function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
};

// An integer contains an optional minus sign to begin and only the digits 0-9
// Objects that can be parsed that way are also considered ints, e.g. "123"
// Floats that are mathematically equal to integers are considered integers, e.g. 1.0
// See here for more discussion: http://stackoverflow.com/questions/1019515/javascript-test-for-an-integer
export function isInteger(i) {
    return !isNaN(parseFloat(i)) && isFinite(i) && i % 1 === 0;
};


/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://gist.github.com/vaiorabbit/5657561
 * Ref.: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @param {string} str the input value
 * @param {boolean} [asString=false] set to true to return the hash value as 
 *     8-digit hex string instead of an integer
 * @param {integer} [seed] optionally pass the hash of the previous chunk
 * @returns {integer | string}
 */
 export function hash/*Fnv32a*/(str, asString=false, seed=0x811c9dc5) {
     /*jshint bitwise:false */
     let ii, len, hval = seed;
     // hval = (seed === undefined) ? 0x811c9dc5 : seed;

     for (ii = 0, len = str.length; ii < len; ii++) {
         hval ^= str.charCodeAt(ii);
         hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
     }
     
     hval = hval >>> 0;

     if( asString ){
         // Convert to 8 digit hex string
         return ("0000000" + hval.toString(16)).substr(-8);
     }
     return hval;
 }


export function normalizeUri(uri){
    let result;
    if( !uri )
        return null;
    result = Url.parse( uri );
    return result.href;
}

export function parseUri( uri, parseQueryString ){
    let result = Url.parse( uri, true );
    if( result.hash ){
        result.fragment = result.hash.substring(1);
        result.baseUri = result.href.slice(0, result.href.length - result.hash.length);
    } else {
        result.baseUri = result.href;
    }

    return result;
}




// /**
//  * parseUri 1.2.2
//  * (c) Steven Levithan <stevenlevithan.com>
//  * MIT License
//  * http://blog.stevenlevithan.com/archives/parseuri
//  */
// export function parseUri( str ) {
//     let o   = parseUri.options,
//         m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
//         uri = {},
//         i   = 14;

//     while (i--) uri[o.key[i]] = m[i] || "";

//     uri[o.q.name] = {};
//     uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
//         if ($1) uri[o.q.name][$1] = $2;
//     });

//     return uri;
// };

// parseUri.options = {
//     strictMode: false,
//     key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
//     q:   {
//         name:   "queryKey",
//         parser: /(?:^|&)([^&=]*)=?([^&]*)/g
//     },
//     parser: {
//         strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
//         loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
//     }
// };





export function parseIntWithDefault( value, defaultValue ){
    let result = parseInt( value, 10 );
    return isNaN(value) ? defaultValue : value;
}

export function resolveUri( from, to ){
    // log.debug( JSON.stringify( from ) + ', ' + JSON.stringify( to ) );
    return Url.resolve( from, to );
}


export function deepClone( obj ){
    return JSON.parse(JSON.stringify(obj));
}

// from: http://www.tuanhuynh.com/blog/2014/unpacking-underscore-clone-and-extend/
export function deepExtend( out, ...others ){
    let ii, len;
    let obj;
    let key,val;

    out || (out={});

    for (ii = 1, len = others.length; ii < len; ii++) {
        obj = others[ii];

        if (!obj){
            continue;
        }

        if (!obj){
            continue;
        }

        for (key in obj) {
            if( !obj.hasOwnProperty(key) ){
                continue;
            }
            val = obj[key];
            
            if( _.isArray(val) ){
                out[key] = deepExtend( out[key] || [], val );
            }
            else if( _.isString(val) ){
                out[key] = String.prototype.slice.call(val);
            }
            else if( _.isDate(val) ){
                out[key] = new Date( val.valueOf() );
            }
            else if (typeof val === 'object'){
                out[key] = deepExtend(out[key], val);
            }
            else {
                out[key] = val;
            }
        }
    }
    return out;
}

export function clearCollection( col ){
    if( !col ){ return new Backbone.Collection(); }
    col.reset();
    return col;
}

export function clearArray( arr ){
    if( !arr ){
        return [];
    }
    while (arr.length > 0) {
        arr.pop();
    }
    return arr;
}

export function clearMap( map ){
    return {};
}

/**
*   If the passed array has only a single value, return
*   that value, otherwise return the array
*/
export function valueArray( array ){
    if (array == null) { return void 0; }
    if( array.length === 1 ){
        return array[0];
    }
    return array;
}



/**
*   calls a passed iterator until it is exhausted.
*   The iterator function should implement a function next()
*   which returns an object containing the value, or if
*   no more values are available, it should return a Promise.reject
*/
export function reduceIterator( iterator, eachFn, memo ){
    return new Promise( function( resolve, reject){
        function iterateOk(item){
            return Promise.resolve()
                .then( function(){
                    if( item.value ){ item = item.value; }
                    return eachFn(memo,item);
                })
                .then( iterate );
        };

        function iterateFail(){
            return resolve( memo );
        }

        function iterate(){
            return iterator.next().then( iterateOk, iterateFail );
        };

        iterate();
    });
}


export function stringify( obj, space ){
    let cache = [];
    return JSON.stringify(obj, function(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                return;
            }
            // Store value in our collection
            cache.push(value);
        }
        return value;
    }, space);
}

export function printIns(arg,depth,showHidden,colors){
    if( _.isUndefined(depth) ) depth = 2;
    // let stack = __stack[1];
    // let fnName = stack.getFunctionName();
    // let line = stack.getLineNumber();
    // Util.log( fnName + ':' + line + ' ' + Util.inspect(arg,showHidden,depth,colors) );
    Util.log( Util.inspect(arg,showHidden,depth,colors) );
};

export function printVar(...args){
    let ii, len;
    for (ii = 0, len = args.length; ii < len; ii++) {
        Util.log( Stringify(args[ii], null, '\t') );
    }
}

/**
*   Converts a string so that the words are capitalised and concatenated
*/
export function toPascalCase( str ){
    return str.match(/[A-Z]?[a-z]+/g).map(function(word){
        return word.charAt(0).toUpperCase() + word.substring(1);
    }).join('');
    // return str.replace(/([A-Z]?[a-z]+)/gi, function(m,word){
        // doesn't deal with the delimiters...
        // return word.charAt(0).toUpperCase() + word.substring(1);
    // });
    // return Classify( str );
}

export function getEntityIdFromId( id ){
    return (id & 0xffffffff);
}

export function getEntitySetIdFromId( id ){
    return (id - (id & 0xffffffff)) /  0x100000000;
}

export function setEntityIdFromId( eid, esid ){
    return (esid & 0x1fffff) * 0x100000000 + (eid & 0xffffffff);
}
