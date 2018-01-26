const Eth = require('../../../src/lib/eth');
const Wallet = require('../../../src/models/wallet'),
  Web3 = require('web3'),
  web3 = new Web3(),
  BigNumber = require('bignumber.js'),
  {accounts, keys} = require('../../accounts');

describe('DealToken', () => {

  const testAccount = {
    address: accounts[0], // '0x31767228EE17C34a821b0aF50E45C705506E32e4',
    privateKey: keys[0], // '0xb3bbe022606f7b7345df92ab110d1582566a7be7487e34f5085dd49cb5236369',
  };

  const options = {
    params: [],
    txParams: {from: testAccount.address, gas: '6712388', gasPrice: '0x174876e800'},
  };

  let dealToken;

  function checkBalance(account, expected) {
    return dealToken.methods.balanceOf(account).call()
      .then((balance) => {
        console.log('balance of token', balance);
        assert.equal(expected, balance);
      });
  }


  function mintTokens(account, amountToMint) {
    return dealToken.methods.mint(account, amountToMint).send(options.txParams)
      .then(() => dealToken.methods.approve(account, amountToMint).call(options.txParams));
  }


  function authorize(account) {
    console.log('authorizing');
    return dealToken.methods.authorizeAddress(account, true).send(options.txParams);
  }

  function unauthorize(account) {
    console.log('authorizing');
    return dealToken.methods.authorizeAddress(account, false).send(options.txParams);
  }

  function checkAuthorized(account, expected) {
    console.log('checking auth');
    return dealToken.methods.isAuthorized(account).call()
      .then((authorized) => assert.equal(expected, authorized));
  }

  function transfer(from, to, amount, shouldFail) {
    return dealToken.methods.transferFrom(from, to, amount).send(options.txParams)
      .then((result) => {
        if (shouldFail) {
          console.log('transfer success - should happen now', result);
          console.log('transfer logs ', JSON.stringify(result.logs));
          // should not reach this code
          assert.fail('transfer succeeded', 'transfer should fail');
        }
      })
      .catch((e) => {
        // if transfer should fail this is ok
        if (!shouldFail) {
          console.log('transfer failed', e);
          assert.fail('transfer failed', 'transfer should succeed');
        }
      });
  }

  const ownerAccount = accounts[0];
  const userAccount = accounts[1];

  beforeEach(() => {
    console.log('redeploying token');
    return Eth.deployContract('DealToken', options)
    .then(result => {
      dealToken = result;
    })
  });

  it('should get instance of lp token', () => {
    assert.isNotNull(dealToken);
  });

  it('should get zero balance of lp token', () => checkBalance(userAccount, 0));

  // it('should authorize ', () => {
  //     return checkAuthorized(userAccount, false)
  //       .then(() => authorize(userAccount))
  //       .then(() => checkAuthorized(userAccount, true));
  // });

  // it('should mint tokens ', () => {
  //   return authorize(userAccount)
  //     .then(() => checkBalance(userAccount, 0))
  //     .then(() => mintTokens(userAccount, 25))
  //     .then(() => checkBalance(userAccount, 25));
  // });

  // it('should transfer tokens to authorized address ', () => {
  //     const shouldFail = false;
  //     return checkBalance(ownerAccount, 0)
  //     .then(() => authorize(ownerAccount))
  //     .then(() => authorize(userAccount))
  //     .then(() => mintTokens(ownerAccount, 100))
  //     .then(() => checkBalance(ownerAccount, 100))
  //     .then(() => transfer(ownerAccount, userAccount, 33, shouldFail));
  //     // .then(() => checkBalance(userAccount, 33))
  //     // .then(() => checkBalance(ownerAccount, 67));
  // });


  // it('should not transfer tokens to an unauthorized address', () => {
  //   const shouldFail = true;
  //   return checkBalance(ownerAccount, 0)
  //     .then(() => authorize(ownerAccount))
  //     .then(() => mintTokens(ownerAccount, 100))
  //     .then(() => transfer(ownerAccount, userAccount, 40, shouldFail))
  //     .then(() => checkBalance(userAccount, 0))
  //     .then(() => checkBalance(ownerAccount, 100));
  // });

  it('should not transfer tokens from an unauthorized address', () => {
    const shouldFail = true;
      return checkBalance(ownerAccount, 0)
      .then(() => authorize(userAccount))
      .then(() => authorize(ownerAccount))
      .then(() => mintTokens(ownerAccount, 100))
      .then(() => unauthorize(ownerAccount))
      .then(() => transfer(ownerAccount, userAccount, 40, shouldFail))
      .then(() => checkBalance(userAccount, 0))
      .then(() => checkBalance(ownerAccount, 100));
  });

});


