// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20("MockToken", "MKT") {
    constructor(uint256 supply) {
        mint(supply);
    }

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}
