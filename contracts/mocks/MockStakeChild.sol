// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IBrawlerBearzStakeChildSupport} from "../interfaces/IBrawlerBearzStakeChildSupport.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**************************************************
 * @title MockStakeChild
 **************************************************/

contract MockStakeChild is AccessControl, IBrawlerBearzStakeChildSupport {
    bytes32 public constant XP_MANAGER = keccak256("XP_MANAGER");

    struct Stake {
        uint256 amount;
        uint256 claimedAt;
        uint256[] tokenIds;
        bool hasClaimed;
    }

    struct Train {
        uint256 startAt;
    }

    struct Quest {
        uint256 startAt;
    }

    struct TokenXP {
        uint256 xp;
        uint256 lastUpdatedAt;
    }

    /// @dev Users' stakes mapped from their address
    mapping(address => Stake) public stakes;

    /// @dev Token id train tracking
    mapping(uint256 => Train) public training;

    /// @dev Token id train tracking
    mapping(uint256 => Quest) public questing;

    /// @dev Token id to xp tracking
    mapping(uint256 => TokenXP) public xpTracker;

    constructor() {
        // Setup access control
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(XP_MANAGER, _msgSender());
    }

    /**
     * @notice Tricks collab.land and other ERC721 balance checkers into believing that the user has a balance.
     * @dev a duplicate stakes(user).amount.
     * @param user - the user to get the balance of.
     */
    function balanceOf(address user) external view returns (uint256) {
        return stakes[user].amount;
    }

    /**
     * @dev Returns staked token ids
     * @param owner - address to lookup
     */
    function getStakedTokens(address owner)
        external
        view
        override
        returns (uint256[] memory)
    {
        uint256[] memory tokenIds = new uint256[](stakes[owner].amount);
        uint256[] storage userTokenIds = stakes[owner].tokenIds;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenIds[i] = userTokenIds[i];
        }
        return tokenIds;
    }

    function stake(address user, uint256[] memory tokenIds) external {
        stakes[user].amount += tokenIds.length;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            stakes[user].tokenIds.push(tokenIds[i]);
        }
    }

    function unstake(address user, uint256[] memory tokenIds) external {
        stakes[user].amount -= tokenIds.length;
        uint256 tokenId;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            removeTokenByValue(user, tokenId);
        }
    }

    function train(uint256[] memory tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            training[tokenIds[i]] = Train({startAt: block.timestamp});
        }
    }

    function stopTraining(uint256[] memory tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            training[tokenIds[i]] = Train({startAt: 0});
        }
    }

    function quest(uint256[] memory tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            questing[tokenIds[i]] = Quest({startAt: block.timestamp});
        }
    }

    function endQuest(uint256[] memory tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            questing[tokenIds[i]] = Quest({startAt: 0});
        }
    }

    function isTraining(uint256 tokenId) public view returns (bool) {
        return training[tokenId].startAt > 0;
    }

    /**
     * @notice Returns whether a token is questing or not
     * @param tokenId - The nft token id
     */
    function isQuesting(uint256 tokenId) public view returns (bool) {
        return questing[tokenId].startAt > 0;
    }

    /**
     * @notice Gets the pending reward for a token
     * @param tokenId - The token id of the item to look at pending XP
     */
    function getXP(uint256 tokenId) external view returns (uint256) {
        return xpTracker[tokenId].xp;
    }

    /**
     * @notice MANUAL OVERRIDE - Set XP accumulation for a given token
     * @param _xp The xp to set
     */
    function setTokenXP(uint256 _tokenId, uint256 _xp)
        external
        onlyRole(XP_MANAGER)
    {
        xpTracker[_tokenId].xp = _xp;
        xpTracker[_tokenId].lastUpdatedAt = block.timestamp;
    }

    // ========================================
    // Helpers
    // ========================================

    function findToken(address user, uint256 value) internal returns (uint256) {
        uint256 i = 0;
        while (stakes[user].tokenIds[i] != value) {
            i++;
        }
        return i;
    }

    function removeTokenByIndex(address user, uint256 i) internal {
        while (i < stakes[user].tokenIds.length - 1) {
            stakes[user].tokenIds[i] = stakes[user].tokenIds[i + 1];
            i++;
        }
    }

    function removeTokenByValue(address user, uint256 value) internal {
        uint256 i = findToken(user, value);
        removeTokenByIndex(user, i);
    }
}
