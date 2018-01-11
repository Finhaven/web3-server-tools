/**
 * note that this isn't intended to be used in production.  it is an in memory store to
 * save wallets (address + privateKeyP
 *
 * @type {{}}
 */

const records = {};
module.exports = {
    deleteById: (id) => {
        delete records[id];
        return Promise.resolve({ok: 1});
    },
    create: (id, record) => {
        records[id] = record;
        return Promise.resolve(record);
    },
    findOrCreate: (id, record) => {
        records[id] = record;
        return Promise.resolve(record);
    },
    find: (id) => {
        if (records[id]) {
            return Promise.resolve(records[id]);
        } else {
            return Promise.reject(new Error('could not find ' + id));
        }
    },
};
