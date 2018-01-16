const Eth = require('../../../src/lib/eth');
const Wallet = require('../../../src/models/wallet'),
  Web3 = require('web3'),
  web3 = new Web3(),
  BigNumber = require('bignumber.js');


/**
 * if ganache-cli is started with a set seed ( `ganache-cli -u 0 -s frontier-seed` )
 * then these accounts are generated
 *
 * Available Accounts
 ==================
 */
const accounts = [];
accounts.push('(0) 0xde4b3c9fa9635f683544b70b322e4763fedeff1f'.split(' ')[1]);
accounts.push('(1) 0x6a6d632e55f20a465a7b73a2de73d1853ca43de7'.split(' ')[1]);
accounts.push('(2) 0xb373de3d22d6a1433412dcd699d520227408e6ec'.split(' ')[1]);
accounts.push('(3) 0x4becd1c1f67e2f29f928904820ee2adac53097b6'.split(' ')[1]);
accounts.push('(4) 0x9a205d26cd436e0c25d4cefa9fbb1be1e8f81b3e'.split(' ')[1]);
accounts.push('(5) 0x158f8c7aeff486296a842876c8128aef15847df5'.split(' ')[1]);
accounts.push('(6) 0x6eed864ddb5542c6aa7f7c3f74fd0d6abbdbab2b'.split(' ')[1]);
accounts.push('(7) 0x4fc2a9c61d0bccd9798f0f92e05e4540cd0d04f6'.split(' ')[1]);
accounts.push('(8) 0xb20fdb91cdfadb4d3a7fb58ff5687103688aee8c'.split(' ')[1]);
accounts.push('(9) 0x01a8d6c71373a320a6363d07f56ef9234251f3cd'.split(' ')[1]);

// console.log('accounts',accounts);

// Private Keys
//= =================
let keys = [];
keys.push('(0) ba2ab3dddf8ff5f498d0813419a0bcaadbceadd895efde2a0453ed89363c6f6a'.split(' ')[1]);
keys.push('(1) 788be453b817631533fe85dcbd1ce93456f432df4b20c5e7e78ffc7e995efe0a'.split(' ')[1]);
keys.push('(2) 00349a17df3a76daf29ac65a8c83e8a470c24f4c0875a74393fa03e2e390662e'.split(' ')[1]);
keys.push('(3) cd5fca47d1bcadf11a2e26a5bf4c938881e6db2cfd1d31fa18faeb09e488dc11'.split(' ')[1]);
keys.push('(4) cecfc4687d78b4b8fffa88902070a7d990d817e34b59e6d09440521a896b20f3'.split(' ')[1]);
keys.push('(5) d30516158a9aff598652c8ad5d434be61b50d81eecdf7b2e915c5345c9abb42a'.split(' ')[1]);
keys.push('(6) cfe2e7cb10fd573db157d9d5de2666c1aba6da819405e4cc1c45095b567d22fb'.split(' ')[1]);
keys.push('(7) a3c8426472b440a5d1a485fa2a8a8bee2d5726c98afce274be60823128245529'.split(' ')[1]);
keys.push('(8) f6839e55e842fa6893f4d07219ae1886a751262063b01fd7b24595e8c2ea5034'.split(' ')[1]);
keys.push('(9) 03f9560e3745f2036b6db24a9df3ec8544d729ef754bcdba6b1a08ebf6e5d022'.split(' ')[1]);

// tack on the 0x
keys = keys.map(k => `0x${k}`);


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

    it('should deploy contract', async function () {
      const options = {
        params: [initialValue],
        txParams: {from: testAccount.address, gas: '6712388', gasPrice: '0x174876e800'},
      };
      // console.log('deployContract params', options.params)
      // console.log('deployContract txParams', options.txParams)
      let simpleContract = await Eth.deployContract('SimpleContract', options);
      console.log('contract deployed at ', simpleContract.options.address);
      assert.isDefined(simpleContract);
      assert.isDefined(simpleContract.contract);
      simpleContractAddress = simpleContract.address;
    });

    it('should get value from simple contract', async function(){
      const SimpleContract = Eth.loadContract('SimpleContract');
      assert.isDefined(SimpleContract);
      console.log('getting contract at ',simpleContractAddress);
      let simpleContract = SimpleContract.at(simpleContractAddress);
      assert.isDefined(simpleContract);
      assert.equal(simpleContract.address, simpleContractAddress);
      let valueBN = await simpleContract.value();
      //convert from bignum to string
      let value = valueBN.toString();
      console.log('simpleContract.value()',value);
      assert.equal(value, String(initialValue));
    });

    it('should increment value from simple contract', async function(){
      const SimpleContract = Eth.loadContract('SimpleContract');
      assert.isDefined(SimpleContract);
      console.log('getting contract at ',simpleContractAddress);
      let simpleContract = SimpleContract.at(simpleContractAddress);
      assert.isDefined(simpleContract);
      assert.equal(simpleContract.address, simpleContractAddress);
      let result = await simpleContract.add(incrementValue);

      // is there something to test here - eg, transaction result?  maybe add an event to the simplecontract (increment event)

      let newValueBN = await simpleContract.value();
      //new value should be bignum
      console.log();
      let newValue = newValueBN.toString();
      console.log('simpleContract.value()',newValue);
      assert.equal(newValue,String(initialValue+incrementValue));
    });

  });
  describe.skip('deal contracts', () => {
    it('should deploy contract', async function () {
      this.timeout(20000);
      const now = Date.now();
      const oneMonth = 1000 * 60 * 60 * 24 * 30; // 30 days anyway
      const start = Number((now / 1000).toFixed());
      const end = Number((((2 * oneMonth) + now) / 1000).toFixed());
      const destinationAddress = accounts[5];
      const rate = new BigNumber(1000);

      console.log(`start ${new Date(start * 1000)} to end ${new Date(end * 1000)}`);

      const options = {
        params: [start, end, rate, destinationAddress],
        txParams: {from: testAccount.address, gas: '6712388', gasPrice: '0x174876e800'},
      };
      // console.log('deployContract params', options.params)
      // console.log('deployContract txParams', options.txParams)
      deal = await Eth.deployContract('Deal', options);
      // console.log('got ',deal);
      assert.isDefined(deal);
      assert.isDefined(deal.contract);
      return deal;
    });

    //FIXME: nit clear why this is currently failing
    it('send eth to contract', async () => {
      assert.isDefined(deal);
      const contractAddress = deal.address;
      return Wallet
        .findOrCreate(testAccount.address, testAccount)
        .then(() => Eth.transfer({
          from: testAccount.address,
          to: contractAddress,
          value: web3.utils.toWei('1', 'ether'),
        }))
        .then((tx) => {
          console.log('eth transfer ', tx);
          const tokenContract = Eth.loadContract('DealToken');
          console.log('deal token address', deal.token());
          tokenContract.at(deal.token)
            .balanceOf(testAccount.address);
        })
        .then((tokenBalance) => {
          console.log('token balance is ', tokenBalance);
        });
    });
  });
});
