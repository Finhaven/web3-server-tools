const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const _ = require('lodash');
const request = require('request');
const fs = require('fs');
const logger = console; //require('./logger');
const Wallet = require('../models/wallet');
const solc = require('solc');

const providerUrl = process.env.HTTP_ETH_RPC || 'http://127.0.0.1:8545';
const etherscanNetwork = process.env.ETHERSCAN_NETWORK || 'rinkeby.etherscan.io';
logger.info('web3 provider ', providerUrl);
const web3 = new Web3(providerUrl);


const provider = web3.currentProvider;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;

const Eth = {
  getAddressUrl(address) {
    return `https://${etherscanNetwork}/address/${address}`;
  },
  getTxUrl(tx) {
    return `https://${etherscanNetwork}/tx/${tx}`;
  },
  findOrCreateAddress(address) {
    return Eth.getAccount(address)
      .then(account => account.address)
      .catch(() => Eth.generateAccount());
  },
  getAccount(address) {
    if (!address) {
      return Promise.reject(new Error('no address provided, not found'));
    } return Wallet.find(address);
  },
  generateAccount() {
    return Promise.resolve(web3
      .eth
      .accounts
      .create())
      .then(account => Wallet.create(account.address, account))
      .then(account => account.address);
  },
  getBalance(address) {
    return new Promise((resolve, reject) => {
      try {
        return web3.eth
          .getBalance(address, (err, result) => {
            if (err) {
              return reject(err);
            }

            return resolve(Number(web3.utils.fromWei(result, 'ether')));
          });
      } catch (err) {
        return reject(err);
      }
    });
  },
  isConnected() {
    try {
      return Promise.all([
        web3.eth.net.getId(),
        web3.eth.getBlockNumber(),
        web3.eth.isSyncing(),
        web3.eth.getGasPrice(),
      ])
        .then(([networkId, blockNumber, syncing, gasPrice]) => ({
          networkId,
          gasPrice,
          syncing,
          blockNumber,
          blockExplorer: `https://${etherscanNetwork}/blocks`,
        }));
    } catch (e) {
      return Promise.reject(e);
    }
  },
  compileContract(name) {
    let contractData = {};
    const compiledPath = `/tmp/${name}.json`;
    try {
      const existing = fs.readFileSync(compiledPath, 'utf8');
      contractData = JSON.parse(existing);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('failed to load existing', e.message);
    }
    if (!contractData) {
      // TODO: use async file api
      const contractPath = `${__dirname}/../../truffle/contracts/`;
      const nodeModulePath = `${__dirname}/../../`;
      const source = fs.readFileSync(`${contractPath + name}.sol`, 'utf8');
      logger.debug('read source', `${name}.sol`);
      logger.debug('read source', source);

      // eslint-disable-next-line
      function findImports(file) {
        logger.debug('importing', file);
        let filePath;
        if (file.indexOf('node_modules') === -1) {
          filePath = contractPath + file;
        } else {
          filePath = nodeModulePath + file;
        }
        const importSource = fs.readFileSync(filePath, 'utf8');
        if (importSource) {
          return { contents: importSource };
        }

        const msg = `could not find import : ${file}`;
        return { error: msg };
      }

      const input = {};
      input[`${name}.sol`] = source;
      const compiled = solc.compile({ sources: input }, 1, findImports);

      logger.debug('compiled output', _.keys(compiled.contracts));

      const compiledName = `${name}.sol:${name}`;
      if (!compiled.contracts[compiledName]) {
        const err = new Error('Contract must have same name as file!');
        logger.debug(err);
        return Promise.reject(err);
      }

      const { bytecode } = compiled.contracts[compiledName];
      const abi = compiled.contracts[compiledName].interface;

      contractData = {
        contract_name: name,
        abi: JSON.parse(abi),
        binary: bytecode,
      };

      fs.writeFileSync(compiledPath, JSON.stringify(contractData, null, 2), 'utf8');
    }

    return contractData;
  },
  loadContract(name, address) {
    // eslint-disable-next-line
    const contractData = require(`../../truffle/build/contracts/${name}.json`);
    const contract = new web3.eth.Contract(contractData.abi, address, {data: contractData.bytecode});
    contract.setProvider(provider);
    return contract;
  },
  deployContract(name, options = {}) {
    const contractBody = Eth.loadContract(name);
    txParams = {
      from: options.txParams.from,
      gas: options.txParams.gas,
      gasPrice: options.txParams.gasPrice
    }
    return contractBody.deploy({arguments: options.params}).send(txParams)
      .then(contractInstance => {
        // Workaround, see https://github.com/FrontierFoundry/web3-server-tools/issues/3
        contractInstance.setProvider(provider);
        return contractInstance;
      }).catch(e => {
        console.log('error while deploying contract: ', e);
      })
  },
  findTransactions(address) {
    logger.debug('findTransactions(address)', address);
    const url = `https://${etherscanNetwork}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&` +
      `sort=asc&apikey=${etherscanApiKey}`;
    return new Promise((resolve, reject) => {
      request({ url, json: true }, (err, res, body) => {
        if (err) {
          return reject(err);
        }
        return resolve(body.result);
      });
    });
  },
  findWalletsWithBalance() {
    return Wallet.search({})
      .then(wallets =>
        Promise.all(wallets.map(w => w.address && Eth.getBalance(w.address).then(b => [w, b]))))
      .then((walletBalances) => {
        // logger.debug(walletBalances);
        const nonZero = _.filter(walletBalances, wb => wb && wb.length === 2 && wb[1] > 0);
        return nonZero;
      });
  },

  prepareTx: function (options) {
    const {
      amount,
      data,
      from,
      to,
    } = options;
    return Promise.all([web3.eth.getGasPrice(), web3.eth.getTransactionCount(from)])
      .then(([gasPrice, transactionCount]) => {
        logger.debug('gas price', gasPrice);
        const gasPriceHex = web3.utils.numberToHex(gasPrice);
        const gasLimitHex = web3.utils.numberToHex(683080);

        const tra = {
          gasPrice: gasPriceHex,
          gasLimit: gasLimitHex,
          from,
          to,
          value: 0,
          nonce: transactionCount,  // the nonce is the number of transactions on this account
          // data: ''
        };

        if (amount) {
          const weiAmount = web3.utils.toWei(amount);
          logger.debug(`amount ${amount} in wei is ${weiAmount}`);
          tra.value = web3.utils.numberToHex(weiAmount);
        }
        if (data) {
          logger.debug(`data ${data}`);
          tra.data = data;
        }

        const tx = new Tx(tra);
        return tx;
      });
  },

  submitTx: function (preparedTx, from) {
    return Wallet
      .find(from)
      .then((w) => {
        if (!w) {
          return Promise.reject(new Error('could not find wallet(priv key) for this address'));
        }

        logger.debug('found wallet ', w);
        const key = Buffer.from(w.privateKey.slice(2), 'hex');
        preparedTx.sign(key);

        const feeCost = preparedTx.getUpfrontCost();
        // tx.gas = feeCost;
        logger.debug(`Total Amount of wei needed:${feeCost.toString()}`);
        logger.debug(`Total Amount of eth needed:${web3.utils.fromWei(feeCost, 'ether').toString()}`);

        const stx = preparedTx.serialize();
        return web3.eth.sendSignedTransaction(`0x${stx.toString('hex')}`);
        // return new Promise((resolve, reject) => {
        //   // return false;
        //   web3.eth.sendSignedTransaction(`0x${stx.toString('hex')}`, (err, hash) => {
        //     if (err) {
        //       logger.debug(err);
        //       return reject(err);
        //     }
        //
        //     logger.debug(`transfer transaction hash ${hash}`);
        //     return resolve(hash);
        //   });
        // });
      });
  },

  // options = {
  //   amount,
  //   data,
  //   from,
  //   to,
  // };
  transfer: function (options) {
    return Eth.prepareTx(options)
      .then((preparedTx) => {
        return Eth.submitTx(preparedTx, options.from);
    });
  },
};

module.exports = Eth;

try {
  Eth.isConnected()
    .then(network => logger.info('connected to network:', network))
    .catch(e => logger.warn(`failed to connect${e}`));
} catch (e) {
  logger.error('isConnected failed');
  logger.warn('Ethereum node must be running for this module to work')
}
