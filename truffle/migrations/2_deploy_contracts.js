const Deal = artifacts.require('./Deal.sol');

module.exports = (deployer) => {
  // let gasLimit = web3.eth.getBlock('pending').gasLimit;
  // console.log('block gasLimit',gasLimit);
  deployer.deploy(Deal);
};
