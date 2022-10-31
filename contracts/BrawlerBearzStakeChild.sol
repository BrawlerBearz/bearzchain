// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20Rewards.sol";
import "./common/NativeMetaTransaction.sol";
import "./tunnel/FxBaseChildTunnel.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IBrawlerBearzStakeChild} from "./interfaces/IBrawlerBearzStakeChild.sol";
import {IBrawlerBearzStakeEvents} from "./interfaces/IBrawlerBearzStakeEvents.sol";
import {IBrawlerBearzQuesting} from "./interfaces/IBrawlerBearzQuesting.sol";

/*******************************************************************************
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|(@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|,|@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@&&@@@@@@@@@@@|,*|&@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%,**%@@@@@@@@%|******%&@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@&##*****|||**,(%%%%%**|%@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@***,#%%%%**#&@@@@@#**,|@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@*,(@@@@@@@@@@**,(&@@@@#**%@@@@@@||(%@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@%|,****&@((@&***&@@@@@@%||||||||#%&@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@&%#*****||||||**#%&@%%||||||||#@&%#(@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@&**,(&@@@@@%|||||*##&&&&##|||||(%@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@**,%@@@@@@@(|*|#%@@@@@@@@#||#%%@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@#||||#@@@@||*|%@@@@@@@@&|||%%&@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@#,,,,,,*|**||%|||||||###&@@@@@@@#|||#%@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@&#||*|||||%%%@%%%#|||%@@@@@@@@&(|(%&@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@&&%%(||||@@@@@@&|||||(%&((||(#%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@%%(||||||||||#%#(|||||%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@&%#######%%@@**||(#%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%##%%&@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
********************************************************************************/

/**************************************************
 * @title BrawlerBearzStakeChild
 * @author @ScottMitchell18
 **************************************************/

contract BrawlerBearzStakeChild is
    FxBaseChildTunnel,
    ERC2771Context,
    AccessControl,
    IBrawlerBearzStakeChild,
    IBrawlerBearzStakeEvents,
    NativeMetaTransaction,
    ReentrancyGuard
{
    /// @dev Sync actions
    bytes32 public constant STAKE = keccak256("STAKE");
    bytes32 public constant UNSTAKE = keccak256("UNSTAKE");
    bytes32 public constant XP_SYNC = keccak256("XP_SYNC");
    bytes32 public constant REWARDS_CLAIM = keccak256("REWARDS_CLAIM");

    /// @dev Reward types
    bytes32 public constant SHOP = keccak256(abi.encodePacked("SHOP"));
    bytes32 public constant CRAWLERZ = keccak256(abi.encodePacked("CRAWLERZ"));
    bytes32 public constant XP = keccak256(abi.encodePacked("XP"));
    bytes32 public constant CREDIT = keccak256(abi.encodePacked("CREDIT"));

    /// @dev Roles
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant YIELD_MANAGER = keccak256("YIELD_MANAGER");
    bytes32 public constant XP_MANAGER = keccak256("XP_MANAGER");
    bytes32 public constant QUEST_MANAGER = keccak256("QUEST_MANAGER");

    uint256 constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 constant SECONDS_PER_HOUR = 60 * 60;
    uint256 constant SECONDS_PER_MINUTE = 60;

    /// @notice amount of token yield for a staked token earns per day
    uint256 public tokensPerYield = 5 ether;
    uint256 public yieldPeriod = 1 days;

    uint256 public trainingYieldPeriod = 1 days;
    uint256 public trainingYield = 3500;

    uint256 public questPrice = 100 ether;

    IERC20Rewards public rewardsToken;

    /// @dev Users' stakes mapped from their address
    mapping(address => Stake) public stakes;

    /// @dev Token id to xp tracking
    mapping(uint256 => TokenXP) public xpTracker;

    /// @dev Token id train tracking
    mapping(uint256 => Train) public training;

    /// @dev Address to reward items
    mapping(address => uint256[]) public rewardIds;

    /// @dev Contract for questing that we can upgrade if needed
    IBrawlerBearzQuesting public questContract;

    constructor(
        address _fxChild,
        address _tokenAddress,
        address _trustedForwarder,
        address _questContractAddress
    ) FxBaseChildTunnel(_fxChild) ERC2771Context(_trustedForwarder) {
        rewardsToken = IERC20Rewards(_tokenAddress);
        // Setup access control
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(OWNER_ROLE, _msgSender());
        _setupRole(YIELD_MANAGER, _msgSender());
        _setupRole(XP_MANAGER, _msgSender());
        _setupRole(QUEST_MANAGER, _msgSender());
        // Setup questing contract
        questContract = IBrawlerBearzQuesting(_questContractAddress);
    }

    // ========================================
    // Management
    // ========================================

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

    /**
     * @notice Updates the yield period
     * @param _yieldPeriod The time period in seconds for yield
     */
    function setYield(uint256 _yieldPeriod) external onlyRole(YIELD_MANAGER) {
        yieldPeriod = _yieldPeriod;
    }

    /**
     * @notice Sets the reward calculation schema.
     * @param _tokensPerYield - a list of held amounts in increasing order.
     */
    function setTokensPerYield(uint256 _tokensPerYield)
        public
        onlyRole(YIELD_MANAGER)
    {
        tokensPerYield = _tokensPerYield;
    }

    /**
     * @notice Sets the cost of a quest
     * @param _questPrice - The price to run a quest
     */
    function setQuestPrice(uint256 _questPrice) public onlyRole(YIELD_MANAGER) {
        questPrice = _questPrice;
    }

    /**
     * @notice Sets the reward calculation for the training per day
     * @param _trainingYield - the xp yield per day for training
     */
    function setTrainingYield(uint256 _trainingYield)
        public
        onlyRole(YIELD_MANAGER)
    {
        trainingYield = _trainingYield;
    }

    /**
     * @notice Updates the training yield period
     * @param _trainingYieldPeriod The time period in seconds for yield
     */
    function setTrainingYieldPeriod(uint256 _trainingYieldPeriod)
        external
        onlyRole(YIELD_MANAGER)
    {
        trainingYieldPeriod = _trainingYieldPeriod;
    }

    // ========================================
    // $CREDIT Claims
    // ========================================

    /// @notice Claims the $CREDIT reward for the transaction
    function claim() external nonReentrant {
        Stake storage stake = stakes[_msgSender()];
        uint256 reward = _calculateReward(stake);
        stake.claimedAt = block.timestamp;
        if (reward > 0) {
            if (!stake.hasClaimed) stake.hasClaimed = true;
            rewardsToken.mint(reward, _msgSender());
            emit RewardClaimed(_msgSender(), reward, stake.claimedAt);
        }
    }

    // ========================================
    // Training
    // ========================================

    /**
     * @notice Train a set of staked token ids
     * @param tokenIds the tokenIds to stake
     */
    function train(uint256[] calldata tokenIds) external {
        uint256 tokenId;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            require(isStakedByUser(_msgSender(), tokenId), "!staked");
            require(!isTraining(tokenId), "training");
            require(!isQuesting(tokenId), "questing");
            training[tokenId].startAt = block.timestamp;
            training[tokenId].endAt = 0;
            training[tokenId].xp = 0;
            emit TrainStart(tokenId, training[tokenId].startAt);
        }
    }

    /**
     * @notice Removes tokens from training
     * @param tokenIds the tokenIds to stake
     */
    function stopTraining(uint256[] calldata tokenIds) external {
        uint256 tokenId;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            require(isStakedByUser(_msgSender(), tokenId), "!staked");
            require(isTraining(tokenId), "!training");
            _resetTraining(tokenId);
        }
    }

    // ========================================
    // Questing
    // ========================================

    /**
     * @notice Quest a set of staked token ids
     * @param tokenIds the tokenIds to quest
     * @param questTypeIds the questTypeIds for quest
     * @param tokenAmount the tokenAmount
     */
    function quest(
        uint256[] calldata tokenIds,
        uint256[] calldata questTypeIds,
        uint256 tokenAmount
    ) external nonReentrant {
        require(
            tokenAmount >= questPrice * tokenIds.length,
            "Not enough token to go on quests"
        );
        uint256 tokenId;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            require(isStakedByUser(_msgSender(), tokenId), "!staked");
            require(!isTraining(tokenId), "training");
        }
        rewardsToken.burn(_msgSender(), tokenAmount);
        questContract.quest(tokenIds, questTypeIds);
    }

    /**
     * @notice Quest a set of staked token ids
     * @param tokenIds the tokenIds to stake
     */
    function endQuest(uint256[] calldata tokenIds) external nonReentrant {
        uint256 tokenId;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            require(isStakedByUser(_msgSender(), tokenId), "!staked");
        }
        questContract.endQuest(_msgSender(), tokenIds);
    }

    /**
     * @notice Sets/updates the address for questing contract
     * @param _questContractAddress - the quest contract address
     */
    function setQuestContract(address _questContractAddress)
        external
        onlyRole(QUEST_MANAGER)
    {
        questContract = IBrawlerBearzQuesting(_questContractAddress);
    }

    // ========================================
    // Read operations
    // ========================================

    /**
     * @notice Gets a rolled up state of a set of token ids
     * @param tokenIds - The token ids to query data for
     */
    function getStateBatch(uint256[] calldata tokenIds)
        external
        view
        returns (State[] memory)
    {
        State[] memory currentStates = new State[](tokenIds.length);

        uint256 tokenId;
        Quest memory currentQuest;
        QuestMetadata memory currentQuestMetadata;
        bool isTokenQuesting;

        for (uint256 i; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            isTokenQuesting = isQuesting(tokenId);

            if (isTokenQuesting) {
                currentQuest = getQuestData(tokenId);
                currentQuestMetadata = getQuestMetadata(currentQuest.questId);
            }

            currentStates[i] = State({
                isTraining: isTraining(tokenId),
                isQuesting: isTokenQuesting,
                syncXP: xpTracker[tokenId].xp,
                training: getTrainingData(tokenId),
                quest: currentQuest,
                questMetadata: currentQuestMetadata
            });
        }
        return currentStates;
    }

    /**
     * @notice Gets the pending reward for the provided user.
     * @param user - the user whose reward is being sought.
     */
    function getReward(address user) external view returns (uint256) {
        return _calculateReward(stakes[user]);
    }

    /**
     * @notice Gets the pending training XP for a token
     * @param tokenId - The token id of the item to look at pending XP
     */
    function getTrainingXP(uint256 tokenId) external view returns (uint256) {
        return _calculateXP(training[tokenId].startAt);
    }

    /**
     * @notice Gets the pending reward for a token
     * @param tokenId - The token id of the item to look at pending XP
     */
    function getXP(uint256 tokenId) external view returns (uint256) {
        return xpTracker[tokenId].xp;
    }

    /**
     * @notice Gets the xpTracker struct for a token id
     * @param tokenId - The token id of the item
     */
    function getXPData(uint256 tokenId) external view returns (TokenXP memory) {
        return xpTracker[tokenId];
    }

    /**
     * @notice Gets the trainings struct for a tokenId
     * @param tokenId - The token id of the item
     */
    function getTrainingData(uint256 tokenId)
        public
        view
        returns (Train memory)
    {
        Train storage instance = training[tokenId];
        return
            Train({
                xp: isTraining(tokenId) ? _calculateXP(instance.startAt) : 0,
                startAt: instance.startAt,
                endAt: instance.endAt
            });
    }

    /**
     * @notice Returns whether a token is training or not
     * @param tokenId - The nft token id
     */
    function isTraining(uint256 tokenId) public view returns (bool) {
        return training[tokenId].startAt > 0;
    }

    /**
     * @notice Returns whether a token is questing or not
     * @param tokenId - The nft token id
     */
    function isQuesting(uint256 tokenId) public view returns (bool) {
        return questContract.isQuesting(tokenId);
    }

    /// @notice Gets all quests
    function getAllQuests() public view returns (QuestMetadata[] memory) {
        return questContract.getAllQuests();
    }

    /// @notice Gets the active quests for the current quest contract
    function getActiveQuests() public view returns (QuestMetadata[] memory) {
        return questContract.getActiveQuests();
    }

    /**
     * @notice Returns quest data for a given token id
     * @param tokenId - The nft token id
     */
    function getQuestData(uint256 tokenId) public view returns (Quest memory) {
        return questContract.getQuestData(tokenId);
    }

    /**
     * @notice Returns quest metadata for a given quest type id
     * @param _questTypeId - The quest type id
     */
    function getQuestMetadata(uint256 _questTypeId)
        public
        view
        returns (QuestMetadata memory)
    {
        return questContract.getQuestMetadata(_questTypeId);
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
        returns (uint256[] memory)
    {
        return stakes[owner].tokenIds;
    }

    /**
     * Determines if a particular token is staked or not by a user
     * @param owner of token id
     * @param tokenId id of the token
     */
    function isStakedByUser(address owner, uint256 tokenId)
        internal
        returns (bool)
    {
        uint256 tokenIndex = findToken(owner, tokenId);
        return tokenIndex < stakes[owner].tokenIds.length;
    }

    // ========================================
    // Internals
    // ========================================

    /**
     * @dev To be called on stake/unstake, evaluates the user's current balance and resets any timers.
     * @param user - the user to update for.
     */
    function _updateBalance(address user) internal {
        Stake storage stake = stakes[user];
        uint256 reward = _calculateReward(stake);
        stake.claimedAt = block.timestamp;
        if (reward > 0) {
            if (!stake.hasClaimed) stake.hasClaimed = true;
            rewardsToken.mint(reward, user);
        }
    }

    /**
     * @dev Resets the training storage and xp tracker with latest
     * @param tokenId - the token id of an nft
     */
    function _resetTraining(uint256 tokenId) internal {
        uint256 originalStartAt = training[tokenId].startAt;
        uint256 gainedXP = _calculateXP(originalStartAt);
        xpTracker[tokenId].xp += gainedXP;
        training[tokenId].startAt = 0;
        training[tokenId].xp = 0;
        training[tokenId].endAt = block.timestamp;
        emit TrainEnd(tokenId, gainedXP, originalStartAt, block.timestamp);
    }

    /**
     * @dev Calculates the reward based
     * @param stake - the stake for the user to calculate upon.
     */
    function _calculateReward(Stake memory stake)
        internal
        view
        returns (uint256)
    {
        uint256 periodsPassed = (block.timestamp - stake.claimedAt) /
            yieldPeriod;
        return stake.amount * periodsPassed * tokensPerYield;
    }

    /**
     * @dev Calculates the training reward
     * @param timestamp - the timestamp to calculate from
     */
    function _calculateXP(uint256 timestamp) internal view returns (uint256) {
        if (timestamp == 0) return 0;
        uint256 periodsPassed = (block.timestamp - timestamp) /
            trainingYieldPeriod;
        return periodsPassed * trainingYield;
    }

    /**
     * @dev Stakes tokens by user and token id
     * @param user - a user address
     * @param tokenIds - a set of token ids
     */
    function _stake(address user, uint256[] memory tokenIds) internal {
        _updateBalance(user);
        stakes[user].amount += tokenIds.length;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            stakes[user].tokenIds.push(tokenIds[i]);
        }
    }

    /**
     * @dev Updates the stake to represent new tokens, starts over the current period.
     * @param user - a user address
     * @param tokenIds - a set of token ids
     */
    function _unstake(address user, uint256[] memory tokenIds) internal {
        _updateBalance(user);
        stakes[user].amount -= tokenIds.length;
        uint256 tokenId;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            require(
                !isTraining(tokenId) && !isQuesting(tokenId),
                "training or questing"
            );
            removeTokenByValue(user, tokenId);
        }
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

    // ========================================
    // Portal integrations
    // ========================================

    /**
     * @notice Sets/updates the address for the root tunnel
     * @param _fxRootTunnel - the fxRootTunnel address
     */
    function setFxRootTunnel(address _fxRootTunnel)
        external
        override
        onlyRole(OWNER_ROLE)
    {
        fxRootTunnel = _fxRootTunnel;
    }

    /// @notice withdraw XP to source chain (ETH)
    function withdrawXP() external {
        uint256[] memory syncTokenIds = stakes[_msgSender()].tokenIds;
        uint256[] memory amounts = new uint256[](syncTokenIds.length);
        uint256 tokenId;
        for (uint256 i = 0; i < syncTokenIds.length; i++) {
            tokenId = syncTokenIds[i];
            amounts[i] = xpTracker[tokenId].xp;
            xpTracker[tokenId].xp = 0;
            xpTracker[tokenId].lastUpdatedAt = block.timestamp;
        }
        // Encode XP data to send to the root chain
        _sendMessageToRoot(
            abi.encode(XP_SYNC, abi.encode(syncTokenIds, amounts, true))
        );
    }

    /// @notice withdraws claimable rewards (ETH)
    function withdrawQuestRewards() external nonReentrant {
        Reward[] memory rewards = questContract.getClaimableRewards(
            _msgSender()
        );

        uint256 totalReward = 0 ether;
        address to = _msgSender();

        Reward memory currentReward;

        for (uint256 i = 0; i < rewards.length; i++) {
            currentReward = rewards[i];
            bytes32 rewardType = keccak256(
                abi.encodePacked(currentReward.typeOf)
            );

            if (XP == rewardType) {
                xpTracker[currentReward.tokenId].xp += currentReward.amount;
            } else if (CREDIT == rewardType) {
                totalReward += currentReward.amount * (1 ether); // tokenId is unused
            } else if (SHOP == rewardType) {
                rewardIds[to].push(currentReward.tokenId);
            }
        }

        if (totalReward > 0) {
            rewardsToken.mint(totalReward, to);
            emit RewardClaimed(to, totalReward, block.timestamp);
        }

        // Encode XP data to send to the root chain
        _sendMessageToRoot(
            abi.encode(REWARDS_CLAIM, abi.encode(to, rewardIds[to]))
        );

        // Clear out rewards on both sides address items
        questContract.emptyClaimableRewards(to);

        delete rewardIds[to];
    }

    /// @dev TEST
    function _processMessageTest(
        uint256,
        address sender,
        bytes memory message
    ) external onlyRole(OWNER_ROLE) {
        (bytes32 syncType, bytes memory syncData) = abi.decode(
            message,
            (bytes32, bytes)
        );
        if (syncType == STAKE) {
            (address from, uint256[] memory tokenIds) = abi.decode(
                syncData,
                (address, uint256[])
            );
            _stake(from, tokenIds);
        } else if (syncType == UNSTAKE) {
            (address from, uint256[] memory tokenIds) = abi.decode(
                syncData,
                (address, uint256[])
            );
            _unstake(from, tokenIds);
        } else {
            revert("INVALID_SYNC_TYPE");
        }
    }

    /**
     * @notice Process message received from FxChild
     * @param sender root message sender
     * @param message bytes message that was sent from Root Tunnel
     */
    function _processMessageFromRoot(
        uint256,
        address sender,
        bytes memory message
    ) internal override validateSender(sender) {
        (bytes32 syncType, bytes memory syncData) = abi.decode(
            message,
            (bytes32, bytes)
        );
        if (syncType == STAKE) {
            (address from, uint256[] memory tokenIds) = abi.decode(
                syncData,
                (address, uint256[])
            );
            _stake(from, tokenIds);
        } else if (syncType == UNSTAKE) {
            (address from, uint256[] memory tokenIds) = abi.decode(
                syncData,
                (address, uint256[])
            );
            _unstake(from, tokenIds);
        } else {
            revert("INVALID_SYNC_TYPE");
        }
    }

    function _msgSender()
        internal
        view
        virtual
        override(ERC2771Context, Context)
        returns (address)
    {
        return ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ERC2771Context, Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }
}
