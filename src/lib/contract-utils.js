const assert = require('assert');
const Web3 = require('web3');

const web3 = new Web3();

function timeNow() {
  return Date.now() / 1000;
}

module.exports = {
  getParamFromTxEvent(transaction, paramName, contractFactory, eventName) {
    assert.isObject(transaction);
    let { logs } = transaction;
    if (eventName != null) {
      logs = logs.filter(l => l.event === eventName);
    }
    assert.equal(logs.length, 1, 'too many logs found!');
    const param = logs[0].args[paramName];
    if (contractFactory != null) {
      const contract = contractFactory.at(param);
      assert.isObject(contract, `getting ${paramName} failed for ${param}`);
      return contract;
    }
    return param;
  },
  getDealParameters(account) {
    // web3.eth.getBlock('latest').timestamp + 1; //+ (60*60*24); //start in a day from latest block
    const startTime = timeNow();
    const endTime = startTime + (60 * 60 * 24 * 30); // end time, 30 days

    // rate of ether to LP Token in wei
    const rate = web3.utils.toWei('.0001', 'ether');

    // the address that will hold the fund. Recommended to use a multisig one for security.
    const wallet = account;

    return {
      startTime,
      endTime,
      rate,
      wallet,
    };
  },
};
