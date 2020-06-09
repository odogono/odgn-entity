import { EntitySet } from "../entity_set";

export enum SType {
    Value = '%v',
    List = '%[]',
    Map = '%{}',
    Function = '%()',
    Bitfield = '%bf',
    Entity = '%e',
    EntitySet = '%es',
    Component = '%c',
    ComponentDef = '%d',
    ComponentAttr = '%ca',
    // ComponentValue = '%cv',
    Any = '%*',
    Filter = '%|'
    // Undefined = '%un'
};



export interface InstDefMeta {
    op: string | string[];
}

export type InstResult<QS extends QueryStack> = [
    QS, StackValue?, boolean?
];
export type AsyncInstResult<QS extends QueryStack> = Promise<InstResult<QS>>;

// export type Result<QS extends QueryStack> = InstResult<QS>;
// export type AsyncResult<QS extends QueryStack> = Promise<InstResult<QS>>;

export type StackValue = [SType] | [SType, any];

export type WordFn<QS extends QueryStack> = SyncWordFn<QS> | AsyncWordFn<QS>;
export type SyncWordFn<QS extends QueryStack> = (stack: QS, val: StackValue) => InstResult<QS>;
export type AsyncWordFn<QS extends QueryStack> = (stack: QS, val: StackValue) => Promise<InstResult<QS>>;

export type WordSpec<QS extends QueryStack> = [string, WordFn<QS>|StackValue, ...(SType|string)[] ];

export type WordEntry<QS extends QueryStack> = [ WordFn<QS>, SType[] ];

export interface Words<QS extends QueryStack> {
    [name: string]: WordEntry<QS>[]
}


export interface QueryStackDefs {
    [def: string]: StackValue;
}

export interface QueryStack {
    id: number;
    es?:EntitySet;
    items: StackValue[];
    words: Words<this>;
    _root: this;
    _parent: this;
    _child: this;
}

export interface StackError {
    original?: any;
}
export class StackError extends Error {
    constructor(...args) {
        super(...args)
        Object.setPrototypeOf(this, StackError.prototype);
        // Log.debug('StackError!', args, this);
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, StackError)
        }
        this.name = 'StackError';
    }
}