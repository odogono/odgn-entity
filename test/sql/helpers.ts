import {
    Entity, isEntity,
} from '../../src/entity';
import { EntitySetSQL, SQLEntitySetOptions } from '../../src/entity_set_sql';

import { EntitySet, EntitySetOptions, isEntitySet } from '../../src/entity_set';
export { EntitySet, isEntitySet } from '../../src/entity_set';
export { EntitySetSQL as EntitySetInst } from '../../src/entity_set_sql';

import { QueryStack } from '../../src/query/stack';
import { tokenizeString } from '../../src/query/tokenizer';
import { StackValue, SType } from '../../src/query/types';
import { createStdLibStack } from '../../src/query';

import {
    toObject as defToObject,
    hash as hashDef,
    isComponentDef,
    ComponentDef,
    getDefId,
} from '../../src/component_def';
import { createLog } from '../../src/util/log';

export { isComponent } from '../../src/component';
export const parse = (data: string) => tokenizeString(data, { returnValues: true });
export const sv = (v: unknown): StackValue => [SType.Value, v];

export { getChanges, ChangeSetOp } from '../../src/change_set';
export { fromComponentId, getComponentDefId, Component, OrphanComponent } from '../../src/component';
export const Log = createLog('TestEntitySetSQL');

export { toValues as bfToValues } from '@odgn/utils/bitfield';
export { Entity, isEntity, getEntityId } from '../../src/entity';
export { QueryStack } from '../../src/query/stack';
export {
    SType,
    StackValue,
    AsyncInstResult,
    StackError,
} from '../../src/query/types';
export { isComponentDef, hash as hashDef, getDefId, Type } from '../../src/component_def';

export { printAll, printEntity } from '../../src/util/print';

import { sqlClear } from '../../src/entity_set_sql/sqlite';
import { BuildQueryFn, loadFixture } from '../es/helpers';
export { buildComponents, loadFixture } from '../es/helpers';


const liveDB = { path: 'test.sqlite', isMemory: false };
const testDB = { uuid: 'TEST-1', isMemory: true };

export const createEntitySet = (options?:SQLEntitySetOptions) => new EntitySetSQL({...options,...testDB});
// export const createEntitySet = (options?: SQLEntitySetOptions) => new EntitySetSQL({ ...options, ...liveDB });


export async function beforeEach() {
    await sqlClear('test.sqlite');
}

export async function buildEntitySet(options?: SQLEntitySetOptions): Promise<[EntitySet, Function]> {
    let es = createEntitySet(options);

    const defs = [
        { url: '/component/channel', properties: ['name'] },
        { url: '/component/status', properties: ['status'] },
        { url: '/component/topic', properties: ['topic'] },
        { url: '/component/username', properties: ['username'] },
        { url: '/component/channel_member', properties: [{ name: 'channel', type: 'integer' }] },
    ]

    for (const def of defs) {
        await es.register(def);
    }
    const buildEntity = (es: EntitySet, buildFn: BuildQueryFn, eid: number = 0) => {
        let e = new Entity(eid);
        const component = (url: string, props: object) => {
            let def = es.getByUrl(url);
            let com = es.createComponent(def, props);
            es.addComponentToEntity(e, com);
        };

        buildFn({ component });
        return e;
    }

    return [es, buildEntity];
}

export async function buildStackEntitySet(stack: QueryStack, options?): Promise<[QueryStack, EntitySet]> {
    let es = createEntitySet(options);

    const defs = [
        { url: "/component/title", properties: ["text"] },
        { url: "/component/completed", properties: [{ "name": "isComplete", "type": "boolean", "default": false }] },
        { url: "/component/priority", properties: [{ "name": "priority", "type": "integer", "default": 0 }] },
    ];

    for (const def of defs) {
        await es.register(def);
    }

    await stack.push([SType.EntitySet, es]);

    return [stack, es];
}


export async function prepES(insts?: string, fixture?: string, options: SQLEntitySetOptions = {}): Promise<[QueryStack, EntitySetSQL]> {
    let es = createEntitySet({ ...options, clearDb: true });
    let values: StackValue[];

    if (fixture) {
        values = await loadFixture(fixture);
    }

    // if( insts === undefined ){
    //     return [undefined,es];
    // }

    if (insts !== undefined) {
        let stack = await es.query(insts, { values });
        return [stack, es];
    }

    let stack = await es.query(undefined, { values });
    return [stack, es];
}


export async function prep(insts?: string): Promise<[QueryStack, EntitySet]> {
    let es = createEntitySet();

    let stack = createStdLibStack();

    if (insts) {
        const words = parse(insts);
        // Log.debug('[parse]', words );
        await stack.pushValues(words);
    }

    // let stack = await es.query(insts, {values} );
    return [stack, es];
}

/**
 * 
 * @param es 
 * @param fixture 
 */
export async function loadFixtureIntoES(es: EntitySetSQL, fixture: string) {
    if (es === undefined) {
        es = createEntitySet();
    }
    let data = await loadFixture(fixture, false);
    let stmt = es.prepare(data);
    await stmt.run();

    return es;
}
