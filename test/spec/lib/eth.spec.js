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


describe('Eth', () => {
  before(() => Wallet.deleteById(testAccount.address));
  describe('account', () => {
    it('should generate address ', async () => {
      const result = await Eth.generateAccount();
      assert.isString(result);
      const account = await Wallet.find(result);
      // console.log('account', account);
      assert.equal(account.address, result);
      assert.isString(account.privateKey);
    });
  });

  it('should be connected', () => Eth.isConnected()
    .then(network => assert.property(network, 'networkId')));
  /**
   * FIXME: need a better testing method for these methods, right now they require ganache-cli to be run independently.
   * it would be nicer if we could at least re-set the state of ganache-cli (eg, to avoid problems like where a test account
   * eth gets used up over time)
   */
  describe('balance', () => {
    it('should get balance ', async () => {
      const result = await Eth.generateAccount();
      const address = result;
      const balance = await Eth.getBalance(address);
      assert.equal(0, balance);
    });

    it('should get non-zero balance of existing address', async () => {
      const balance = await Eth.getBalance(testAccount.address);
      console.log('balance', balance);
      assert.isAbove(balance, 0, 'should have balance');
    });
  });

  describe('simple contract', () => {
    let simpleContractAddress;
    const initialValue = 100;
    const incrementValue = 13;

    const options = {
      params: [initialValue],
      txParams: {from: testAccount.address, gas: '6712388', gasPrice: '0x174876e800'},
    };

    it('should deploy contract', async function () {
      // console.log('deployContract params', options.params)
      // console.log('deployContract txParams', options.txParams)

      let simpleContract = await Eth.deployContract('SimpleContract', options);
      console.log('contract deployed at ', simpleContract.options.address);
      assert.isDefined(simpleContract);
      assert.isDefined(simpleContract.options.address);
      simpleContractAddress = simpleContract.options.address;
    });

    it('should get value from simple contract', async function () {
      console.log('getting contract at ', simpleContractAddress);
      const simpleContract = Eth.loadContract('SimpleContract', simpleContractAddress);
      assert.isDefined(simpleContract);
      assert.equal(simpleContract.options.address, simpleContractAddress);
      let valueBN = await simpleContract.methods.value().call();
      //convert from bignum to string
      let value = valueBN.toString();
      console.log('simpleContract.value()', value);
      assert.equal(value, String(initialValue));
    });

    it('should increment value from simple contract', async function () {
      console.log('getting contract at ', simpleContractAddress);
      const simpleContract = Eth.loadContract('SimpleContract', simpleContractAddress);
      assert.isDefined(simpleContract);
      assert.equal(simpleContract.options.address, simpleContractAddress);

      let result = await simpleContract.methods.add(incrementValue).send(options.txParams);

      // is there something to test here - eg, transaction result?  maybe add an event to the simplecontract (increment event)

      let newValueBN = await simpleContract.methods.value().call();
      //new value should be bignum
      let newValue = newValueBN.toString();
      console.log('simpleContract.value()', newValue);
      assert.equal(newValue, String(initialValue + incrementValue));
    });

  });

  describe('deal contracts', () => {
    const now = Date.now();
    const oneMonth = 1000 * 60 * 60 * 24 * 30; // 30 days anyway
    const start = Number((now / 1000).toFixed());
    const end = Number((((2 * oneMonth) + now) / 1000).toFixed());
    const destinationAddress = accounts[5];
    const rate = new BigNumber(1000);

    const options = {
      params: [start, end, rate, destinationAddress],
      txParams: {from: testAccount.address, gas: '6712388', gasPrice: '0x174876e800'},
    };

    it('should deploy contract', async function () {
      this.timeout(20000);

      console.log(`start ${new Date(start * 1000)} to end ${new Date(end * 1000)}`);

      // console.log('deployContract params', options.params)
      // console.log('deployContract txParams', options.txParams)
      deal = await Eth.deployContract('Deal', options);
      // console.log('got ',deal);
      assert.isDefined(deal);
      assert.isDefined(deal.options.address);
      return deal;
    });

    it('send eth to contract', async () => {
      deal = await Eth.loadContract('Deal', deal.options.address, options);
      assert.isDefined(deal);
      const contractAddress = deal.options.address;
      console.log('contractAddress',contractAddress);
      return Wallet
        .findOrCreate(testAccount.address, testAccount)
        .then(() => Eth.transfer({
          from: testAccount.address,
          to: contractAddress,
          value: web3.utils.toWei('1', 'ether'),
        }))
        .then((tx) => {
          console.log('eth transfer ', tx);
        })
        .then(async () => {
          const balance = await Eth.getBalance(contractAddress);
          console.log('balance was',balance);
          assert.equal(balance.toString(),web3.utils.toWei('1', 'ether'))
        });

    });
  });
});
