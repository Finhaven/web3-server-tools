const Eth = require('../../../src/lib/eth');
const Wallet = require('../../../src/models/wallet'),
  Web3 = require('web3'),
  web3 = new Web3(),
  BigNumber = require('bignumber.js'),
  {accounts, keys} = require('../../accounts');


const testAccount = {
  address: accounts[0], // '0x31767228EE17C34a821b0aF50E45C705506E32e4',
  privateKey: keys[0], // '0xb3bbe022606f7b7345df92ab110d1582566a7be7487e34f5085dd49cb5236369',
};
let deal;


describe('Deal Token', () => {
  before(() => Wallet.deleteById(testAccount.address));

  /**
   * implement the same tests as in truffle/test/spec/deal-token.spec.js
   * but without using truffle-contract/truffle.
   *
   */
});



