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

const investorAccount = {
  address: accounts[1],
  privateKey: keys[1],
};

const etherInvested = '1';
const delay = 2 * 1000;
const oneMonth = 1000 * 60 * 60 * 24 * 30; // 30 days anyway
const rate = new BigNumber(1000);


const options = {
  params: [],
  txParams: {from: testAccount.address, gas: '6712388', gasPrice: '0x174876e800'}
};

const buyTokensOptions = {
  txParams: {from: investorAccount.address, gas: '6712388', gasPrice: '0x174876e800', value: web3.utils.toWei(etherInvested, 'ether')}
};

let deal, dealFactory, dealToken;

function createDeal (start, end){
  weiToTokenRate = rate;
  return dealFactory.methods
    .createDeal(start, end, rate, testAccount.address).send(options.txParams)
    .then(result => {
      const dealAddress = result.events.DealCreated.returnValues.instance;
      console.log(dealAddress);
      return Eth.loadContract('Deal', dealAddress);
    })
    .then(instance => {
      deal = instance;
      assert.isNotNull(deal);
      assert.isNotNull(deal.options.address);
      return deal.methods.token().call()
    })
    .then(dealTokenAddress => {
      assert.isNotNull(dealTokenAddress);
      return Eth.loadContract('DealToken', dealTokenAddress)
    })
    .then(token => {
      dealToken = token;
    });
};



describe('Deal factory', () => {
  const now = Date.now();
  const dealStart = Number(((now + delay) / 1000).toFixed());
  const dealEnd = Number((((2 * oneMonth) + now) / 1000).toFixed());

  before(() => {
    return Eth.deployContract('DealFactory', options)
      .then(result => {
        dealFactory = result;
        return result;
      })
  });

  it('should not create deal in the past', () => {
    return dealFactory.methods
      .createDeal(100, dealEnd, rate, testAccount.address).send(options.txParams)
      .then(() => {
        return Promise.reject('Expected method to reject.');
      })
      .catch((err) => {
        assert.isDefined(err);
        assert.equal(err.message, 'Returned error: VM Exception while processing transaction: revert')
      });
  });

  it('should not create deal with invalid time', () => {
    return dealFactory.methods
      .createDeal(dealEnd, dealStart, rate, testAccount.address).send(options.txParams)
      .then(() => {
        return Promise.reject('Expected method to reject.');
      })
      .catch((err) => {
        assert.isDefined(err);
        assert.equal(err.message, 'Returned error: VM Exception while processing transaction: revert')
      });
  });
});




// Need more tests
describe('Deals', () => {

  before(() => Wallet.deleteById(testAccount.address));
  before(() => Wallet.deleteById(investorAccount.address));

  describe('authorization', () => {
    before(() => {
      const now = Date.now();
      const dealStart = Number(((now + delay) / 1000).toFixed());
      const dealEnd = Number((((2 * oneMonth) + now) / 1000).toFixed());
      console.log('Deal start', dealStart)
      console.log('Deal end', dealEnd)
      return Eth.deployContract('DealFactory', options)
        .then(result => {
          dealFactory = result;
          return result;
        })
        .then(() => createDeal(dealStart, dealEnd))
        .then(() => {
          return new Promise((resolve) => setTimeout(resolve, delay * 2))
        })
    });

    it('should not buy tokens by unauthorized investor', () => {
      let investor = investorAccount.address;
      const weiInvested = '3';
      const value = 0.00003;
      return Wallet
        .findOrCreate(investorAccount.address, investorAccount)
        .then(() => {
          return dealToken.methods.balanceOf(investor).call()
        })
        .then(result => {
          assert.equal(result, 0);
          return deal.methods.buyTokens(investor)
            .send(buyTokensOptions.txParams)
        })
        .then(() => {
          return Promise.reject('Expected method to reject.');
        })
        .catch(err => {
          assert.isDefined(err);
          assert.equal(err.message, 'Returned error: VM Exception while processing transaction: revert')
        })
        .then(() => {
          return dealToken.methods.balanceOf(investor).call()
        })
        .then(result => {
          assert.equal(result, 0);
        })
      });

    it('should authorize investor and buy tokens by him', () => {
      let investor = investorAccount.address;
      return Wallet
        .findOrCreate(investorAccount.address, investorAccount)
        .then(() => {
          return deal.methods.authorize(investor).send(options.txParams)
        })
        .then(result => {
          assert.equal(result.events.Authorizing.returnValues.investor.toLowerCase(), investor.toLowerCase());
          return dealToken.methods.balanceOf(investor).call()
        })
        .then(result => {
          assert.equal(result, 0);
          console.log(buyTokensOptions);
          buyTokensOptions.txParams.data = '';
          // FIXME waiting for https://github.com/Finhaven/web3-server-tools/issues/13
          // return Eth.transfer({
          //   from: investor,
          //   to: deal.options.address,
          //   amount: etherInvested
          // });
          return deal.methods.buyTokens(investor).send(buyTokensOptions.txParams)
        })
        .then(result => {
          assert.equal(result.events.TokenPurchase.returnValues.value, web3.utils.toWei(etherInvested, 'ether'));
          return dealToken.methods.balanceOf(investor).call()
        })
        .then(result => {
          assert.equal(result/rate, web3.utils.toWei(etherInvested, 'ether'));
        });
      });
  });

  it('should not buy tokens after deal ends', () => {
    const now = Date.now();
    const dealStart = Number(((now + delay) / 1000).toFixed());

    let investor = investorAccount.address;
    const etherInvested = '1';
    return Wallet
      .findOrCreate(investorAccount.address, investorAccount)
      .then(() => {
        console.log('Deal start: ', dealStart)
        console.log('Deal end: ', dealStart + delay * 4 / 1000)
        return createDeal(dealStart, dealStart + delay * 4 / 1000)
      })
      .then(() => {
        console.log('Pause 1: ', Date.now())
        return new Promise((resolve) => setTimeout(resolve, delay * 3))
      })
      .then(result => {
        console.log('Pause 2: ', Date.now())
        return deal.methods.authorize(investor).send(options.txParams)
      })
      .then(result => {
        console.log('Buy 1: ', Date.now())
        return deal.methods.buyTokens(investor).send(buyTokensOptions.txParams)
      })
      .then(() => {
        return dealToken.methods.balanceOf(investor).call()
      })
      .then(result => {
        assert.equal(result/rate, web3.utils.toWei(etherInvested, 'ether'));
        return new Promise((resolve) => setTimeout(resolve, delay * 4))
      })
      .then(result => {
        console.log('Buy 2: ', Date.now())
        return deal.methods.buyTokens(investor).send(buyTokensOptions.txParams)
      })
      .then(() => {
        return Promise.reject('Expected method to reject.');
      })
      .catch(err => {
        assert.isDefined(err);
        assert.equal(err.message, 'Returned error: VM Exception while processing transaction: revert')
      });
    });



});
