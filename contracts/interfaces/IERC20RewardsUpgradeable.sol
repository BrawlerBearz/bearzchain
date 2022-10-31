//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface IERC20RewardsUpgradeable is IERC20Upgradeable {
    /**
     * Mints to the given account from the sender provided the sender is authorized.
     */
    function mint(uint256 amount, address to) external;

    /**
     * Mints to the given accounts from the sender provided the sender is authorized.
     */
    function bulkMint(uint256[] calldata amounts, address[] calldata to)
        external;

    /**
     * Burns the given amount for the user provided the sender is authorized.
     */
    function burn(address from, uint256 amount) external;

    /**
     * Gets the amount of mints the user is entitled to.
     */
    function getMintAllowance(address user) external view returns (uint256);

    /**
     * Updates the allowance for the given user to mint. Set to zero to revoke.
     *
     * @dev This functionality programatically enables allowing other platforms to
     *      distribute the token on our behalf.
     */
    function updateMintAllowance(address user, uint256 amount) external;
}
