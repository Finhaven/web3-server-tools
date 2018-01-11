const Web3 = require('web3'),
  web3 = new Web3();
  // _ = require('lodash');

function timeNow() {
  return Date.now() / 1000;
}

module.exports = {
  getParamFromTxEvent(transaction, paramName, contractFactory, eventName) {
    assert.isObject(transaction);
    let logs = transaction.logs;
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
    const startTime = timeNow(); // web3.eth.getBlock('latest').timestamp + 1; //+ (60*60*24); //start in a day from latest block
    const endTime = startTime + (60 * 60 * 24 * 30); // end time, 30 days
    const rate = web3.utils.toWei('.0001', 'ether'); // new BigNumber(1000); // rate of ether to LP Token in wei
    const wallet = account; // the address that will hold the fund. Recommended to use a multisig one for security.
    return {
      startTime, endTime, rate, wallet,
    };
  },
};

