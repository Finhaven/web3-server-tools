pragma solidity ^0.4.15;

import '../../node_modules/zeppelin-solidity/contracts/crowdsale/Crowdsale.sol';
import '../../node_modules/zeppelin-solidity/contracts/token/MintableToken.sol';
import '../../node_modules/zeppelin-solidity/contracts/token/LimitedTransferToken.sol';

contract Deal is Crowdsale, LimitedTransferToken, MintableToken {
    MintableToken dealToken;
    mapping (address => bool) authorized;
    event Authorizing(address sender, address investor);

    function Deal(uint256 _startTime, uint256 _endTime, uint256 _rate, address _wallet)
        Crowdsale(_startTime, _endTime, _rate, _wallet) {
    }

    // creates the token to be sold.
    // override this method to have crowdsale of a specific MintableToken token.
    function createTokenContract() internal returns (MintableToken) {
        dealToken = new MintableToken();
        return dealToken;
    }

    function buyTokens(address beneficiary) public payable {
        return super.buyTokens(beneficiary);
    }
}
