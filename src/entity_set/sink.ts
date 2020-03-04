import { LCMD_COMMAND, LCMD_REMOVE_COMPONENT } from '../types';
import { isComponent, isEntity } from '../util/is';

import { Entity } from '../entity';
import { EntitySet } from '../entity_set';
// import { Entity } from '../entity';
// import { Component } from '../component';
// import { cloneComponent, cloneEntity } from '../util/clone';
import { JSONLoader } from '../util/loader';
import { createLog } from '../util/log';
import { toString as entityToString } from '../util/to_string';

const Log = createLog('EntitySetSink');

/**
 * pull-stream sink - takes incoming components and adds to the entity set
 */

interface PullStreamSinkOptions {
    source?: EntitySet;
    did?: string;
}

interface AddEntityOptions {
    // original id
    oid?: string;
}

/**
 * A pull-stream sink which interprets incoming objects into
 * commands that affect the given entitySet
 *
 * @param {*} entitySet
 * @param {*} options
 * @param {Function} completeCb
 */
export function PullStreamSink(
    entitySet: EntitySet,
    options: PullStreamSinkOptions = {},
    completeCb?: Function
) {
    // let result = [];
    const loader = new JSONLoader();
    let context = { entitySet, registry: entitySet.getRegistry() };
    // Log.debug('[PullStreamSink]', 'context', context);
    const { source, did } = options;

    let addEntityOptions: AddEntityOptions = {};
    if (source) {
        addEntityOptions.oid = source.cid;
    }

    return function(read) {
        read(null, function next(end, data) {
            // console.log('[stringSink]', end, stringify(data));

            if (end === true) {
                // result = [].concat.apply([], result);
                return completeCb ? completeCb() : null;
            }
            if (end) {
                throw end;
            }

            try {
                let p;
                // Log.debug('[sink]', 'what is', data);
                let [item, itemOptions] = data;

                // check whether the incoming data has an OriginID and whether
                // that OID matches the entitySet to which we are connected.
                // if they do match, then disregard the event, as it originally came
                // from the entitySet - an echo!
                if (itemOptions.oid === entitySet.cid) {
                    // Log.debug('🐸 [sink][Entity]', `looks like origin ${itemOptions.oid} is same as target ${entitySet.cid}`);
                    return read(null, next);
                }

                if (isComponent(item)) {
                    p = entitySet.addComponent(item);
                } else if (isEntity(item)) {
                    // Log.debug('🦊 [sink][Entity]', source.cid,'>',entitySet.cid, itemOptions, item.getComponents().map(c=>[c.id,c.cid]));

                    p = entitySet.addEntity(item, addEntityOptions); // '🐰'

                    // Log.debug('🐵 [sink][Entity]',p);

                    // let added = entitySet.getUpdatedEntities();
                    // if( added ) Log.debug('🐷 [sink][Entity]', added.cid, added.getComponents().map(c=>c.cid) );
                    // if( added ) Log.debug('🐷 [sink][Entity]', data == added, data.msg, added.msg );
                } else {
                    // Log.debug('[sink][_processCommand]', entitySet.cid, item);
                    if (item[LCMD_COMMAND] === LCMD_REMOVE_COMPONENT) {
                        // Log.debug('[sink][_processCommand]', entitySet._components);
                    }
                    p = loader._processCommand(context, item, options);
                }
                if (p instanceof Promise) {
                    p.then(() => read(null, next));
                } else {
                    read(null, next);
                }
            } catch (err) {
                Log.error('[read] error', err);
                read(null, next);
            }
        });
    };
}