const { assert } = require('chai');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');

const web3 = new Web3();

const Eth = require('../../../src/lib/eth');
const Evm = require('../../utils/evm');
const Wallet = require('../../../src/models/wallet');
const { accounts, keys } = require('../../accounts');

const testAccount = {
  address: accounts[0], // '0x31767228EE17C34a821b0aF50E45C705506E32e4',
  privateKey: keys[0], // '0xb3bbe022606f7b7345df92ab110d1582566a7be7487e34f5085dd49cb5236369',
};

describe('Eth', () => {
  before(() => Wallet.deleteById(testAccount.address));

  describe('utils', () => {
    it('should increase EVM time ', () => {
      let initialTime;
      const timeDiff = 100;

      return Eth.getCurrentTimestamp()
        .then((firstTime) => {
          initialTime = firstTime;
          return Evm.increaseTimeTestRPC(timeDiff);
        })
        .then(() => Eth.getCurrentTimestamp())
        .then((finalTime) => {
          assert(finalTime > initialTime);
        });
    });
  });

  describe('account', () => {
    it('should generate address ', () => Eth.generateAccount()
      .then((result) => {
        assert.isString(result);
        return Wallet.find(result);
      })
      .then((account) => {
        assert.isString(account.privateKey);
      }));
  });

  it('should be connected', () => Eth.isConnected()
    .then(network => assert.property(network, 'networkId')));
  /**
   * FIXME: need a better testing method for these methods,
   * right now they require ganache-cli to be run independently.
   *
   * It would be nicer if we could at least re-set the state of `ganache-cli`
   * (eg, to avoid problems like where a test account eth gets used up over time)
   */
  describe('balance', () => {
    it('should get balance ', async () => {
      const address = await Eth.generateAccount();
      const balance = await Eth.getBalance(address);
      assert.equal(0, balance);
    });

    it('returns a string', async () => {
      const balance = await Eth.getBalance(testAccount.address);
      assert.isString(balance);
    });

    it('should get non-zero balance of existing address', async () => {
      const balance = new BigNumber(await Eth.getBalance(testAccount.address));
      console.log('balance', balance.toString(10));
      assert(balance.gt(0), 'should have balance');
    });

    describe('precision', () => {
      it('can handle small changes without rounding errors', async () => {
        const address = await Eth.generateAccount();

        await Wallet.findOrCreate(testAccount.address, testAccount);
        const sendEth = amount => Eth.transfer({ from: testAccount.address, to: address, amount });

        await sendEth('0.000000000000000001');
        await sendEth('1');
        await sendEth('0.000000000000000001');

        assert.equal(await Eth.getBalance(address), '1.000000000000000002');
      });

      it('can handle large vales without rounding errors'); // waiting on --defaultBalanceEther to work
    });
  });

  describe('simple contract', () => {
    let contract;
    let contractAddress;

    const initialValue = 100;
    const incrementValue = 13;

    const options = {
      params: [initialValue],
      txParams: {
        from: testAccount.address,
        gas: '6712388',
        gasPrice: '0x174876e800',
      },
    };

    it('should deploy contract', () => Eth.deployContract('SimpleContract', options)
      .then((resultContract) => {
        contract = resultContract;
        console.log('contract deployed at ', resultContract.options.address);
        assert.isDefined(resultContract);
        assert.isDefined(resultContract.options.address);
        contractAddress = resultContract.options.address;
      }));

    it('should get value from contract', () => {
      assert.equal(contract.options.address, contractAddress);
      return contract.methods.value().call()
        .then((valueBN) => {
          // convert from bignum to string
          const value = valueBN.toString();
          console.log('contract.value()', value);
          assert.equal(value, String(initialValue));
        });
    });

    it('should increment value from simple contract', () => {
      assert.isDefined(contract);
      assert.equal(contract.options.address, contractAddress);

      return contract.methods.add(incrementValue).send(options.txParams)
        // is there something to test here - eg, transaction result?
        // maybe add an event to the simplecontract (increment event)
        .then(() => contract.methods.value().call())
        .then((newValueBN) => {
        // new value should be bignum
          const newValue = newValueBN.toString();
          console.log('contract.value()', newValue);
          assert.equal(newValue, String(initialValue + incrementValue));
        });
    });
  });

  describe('ETH actions', () => {
    it('send eth to address', () => {
      const receiver = web3.eth.accounts.create();
      return Wallet
        .findOrCreate(testAccount.address, testAccount)
        .then(() => Eth.getBalance(testAccount.address))
        .then((balance) => {
          console.log('Sender: ', testAccount.address);
          console.log('Old balance: ', balance.toString());
        })
        .then(() => Eth.transfer({
          from: testAccount.address,
          to: receiver.address,
          amount: '0.02',
        }))
        .then((tx) => {
          console.log('eth transfer ', tx);
          return Eth.getBalance(testAccount.address);
        })
        .then((balance) => {
          console.log('New balance ', balance.toString());
        })
        .then(() => Eth.getBalance(receiver.address))
        .then((balance) => {
          console.log('New balance ', balance.toString());
          assert.equal(balance.toString(), '0.02');
        });
    });

    it('send eth to address in a deferred way', async () => {
      const receiver = web3.eth.accounts.create();
      let preparedTx;

      return Wallet
        .findOrCreate(testAccount.address, testAccount)
        .then(() => Eth.getBalance(testAccount.address))
        .then((balance) => {
          console.log('Sender: ', testAccount.address);
          console.log('Old balance: ', balance.toString());
        })
        .then(() => Eth.prepareTx({
          from: testAccount.address,
          to: receiver.address,
          amount: '0.02',
        }))
        .then((tx) => {
          preparedTx = tx;
          return Eth.getBalance(receiver.address);
        })
        .then((balance) => {
          assert.equal(balance.toString(), '0');
          return Eth.submitTx(preparedTx, testAccount.address);
        })
        .then(() => Eth.getBalance(receiver.address))
        .then((balance) => {
          console.log('New balance ', balance.toString());
          assert.equal(balance.toString(), '0.02');
        });
    });
  });
});
