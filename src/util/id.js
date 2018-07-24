/**
 * Returns the entity id portion of an id 
 * @param {*} id 
 */
export function getEntityIDFromID(id) {
    return id & 4294967295;
}

/**
 * Returns the EntitySet portion of an id
 * @param {*} id 
 */
export function getEntitySetIDFromID(id) {
    return (id - (id & 4294967295)) / 4294967296;
}

/**
 * Sets the entity and entityset id on a number
 * 
 * @param {*} eid 
 * @param {*} esid 
 */
export function setEntityIDFromID(eid, esid) {
    return (esid & 2097151) * 4294967296 + (eid & 4294967295);
}

