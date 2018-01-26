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

  let dealToken;

  async function checkBalance(account, expected) {
    return dealToken.methods.balanceOf(account).call()
      .then((balance) => {
        console.log('balance of token', balance);
        assert.equal(expected, balance);
      });
  }


  async function mintTokens(account, amountToMint) {
    return dealToken.methods.mint(account, amountToMint).call()
      .then(() => dealToken.methods.approve(account, amountToMint).call());
  }


  async function authorize(account) {
    return () => dealToken.methods.authorizeAddress(account, true).call();
  }

  async function checkAuthorized(account, expected) {
    return () => dealToken.methods.isAuthorized(account).call()
      .then((authorized) => assert.equal(expected, authorized));
  }

  async function transfer(from, to, amount, shouldFail) {
    return dealToken.methods
      .transferFrom(from, to, amount).call()
      .then((result) => {
        if (shouldFail) {
          console.log('transfer success - should happen now', result);
          console.log('transfer logs ', JSON.stringify(result.logs));
          // should not reach this code
          assert.fail('transfer succeeded', 'transfer should fail');
        }
      })
      .catch(() => {
        // if transfer should fail this is ok
        if (!shouldFail) {
          // console.log('transfer failed', e);
          assert.fail('transfer failed', 'transfer should succeed');
        }
      });
  }

  const ownerAccount = accounts[0];
  const userAccount = accounts[1];
  const userAccount2 = accounts[2];

  beforeEach(async () => {
    console.log('redeploying token');
    const options = {
      params: [],
      txParams: {from: testAccount.address, gas: '6712388', gasPrice: '0x174876e800'},
    };
    dealToken = await Eth.deployContract('DealToken', options);
  });

  it('should get instance of lp token', () => {
    assert.isNotNull(dealToken);
  });

  it('should get zero balance of lp token', () => checkBalance(userAccount, 0));

  it('should authorize ', async () => {
      return checkAuthorized(userAccount, false)
        .then(() => authorize(userAccount))
        .then(() => checkAuthorized(userAccount, false));
  });

  it('should authorize ', async () => {
      return checkAuthorized(userAccount, false)
        .then(() => authorize(userAccount))
        .then(() => checkAuthorized(userAccount, true));
  });


  // it('should mint tokens ', async () => {
  //   return Promise.resolve()
  //     .then(authorize(userAccount))
  //     .then(checkBalance(userAccount, 0))
  //     .then(mintTokens(userAccount, 25))
  //     .then(checkBalance(userAccount, 25));
  // });

  // it('should transfer tokens to authorized address ', async () => {
  //   return Promise.resolve()
  //     .then(checkBalance(userAccount, 0))
  //     .then(authorize(userAccount))
  //     .then(authorize(userAccount2))
  //     .then(mintTokens(ownerAccount, 100))
  //     .then(checkBalance(ownerAccount, 100))
  //     .then(transfer(ownerAccount, userAccount, 33, false))
  //     .then(checkBalance(userAccount, 33))
  //     .then(checkBalance(ownerAccount, 67));
  // });


  // it('should not transfer tokens to an unauthorized address', () => {
  //   const shouldFail = true;
  //   return Promise.resolve()
  //     .then(checkBalance(userAccount, 0))
  //     .then(authorize(userAccount))
  //     .then(mintTokens(userAccount, 100))
  //     .then(transfer(userAccount, userAccount2, 40, shouldFail))
  //     .then(checkBalance(userAccount2, 0))
  //     .then(checkBalance(userAccount, 100));
  // });

  // it('should not transfer tokens from an unauthorized address', () => {
  //   const shouldFail = true;
  //   return Promise.resolve()
  //     .then(checkBalance(userAccount, 0))
  //     .then(authorize(userAccount2))
  //     .then(mintTokens(userAccount, 100))
  //     .then(transfer(userAccount, userAccount2, 40, shouldFail))
  //     .then(checkBalance(userAccount2, 0))
  //     .then(checkBalance(userAccount, 100));
  // });

});


