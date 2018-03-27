const Web3 = require('web3');

const providerUrl = process.env.HTTP_ETH_RPC || 'http://127.0.0.1:8545';
const web3 = new Web3(providerUrl);

const Evm = {
  increaseTimeTestRPC(seconds) {
    return new Promise((resolve, reject) => {
      function callback2(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }

      function callback1() {
        web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_mine',
          params: [],
          id: new Date().getSeconds(),
        }, callback2);
      }

      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [seconds],
        id: new Date().getSeconds(),
      }, callback1);
    });
  },
};

module.exports = Evm;
