// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IBrawlerBearzQuesting} from "./interfaces/IBrawlerBearzQuesting.sol";
import {IBrawlerBearzQuestCommon} from "./interfaces/IBrawlerBearzQuestCommon.sol";

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
 * @title BrawlerBearzQuesting
 * @author @ScottMitchell18
 **************************************************/

contract BrawlerBearzQuesting is
    Initializable,
    AccessControlUpgradeable,
    IBrawlerBearzQuestCommon,
    IBrawlerBearzQuesting
{
    using Strings for uint256;

    /// @dev Role types
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant QUEST_CREATOR_ROLE =
        keccak256("QUEST_CREATOR_ROLE");
    bytes32 public constant QUEST_EXECUTOR_ROLE =
        keccak256("QUEST_EXECUTOR_ROLE");

    bytes32 public constant SHOP_ITEM = keccak256(abi.encodePacked("SHOP"));

    /// @notice nonce for claim requests
    uint256 private requestNonce;

    /// @notice Last quest id
    uint256 public lastQuestId;

    /// @dev Token id to quest
    mapping(uint256 => Quest) public tokenQuests;

    /// @dev Quest enum to quest metadata
    mapping(uint256 => QuestMetadata) public availableQuests;

    /// @dev Token id to quest
    mapping(address => Reward[]) public rewardsToClaim;

    /// @dev Token id to quest id to cooldown
    mapping(uint256 => mapping(uint256 => Cooldown)) public tokenQuestCooldowns;

    function initialize() public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(OWNER_ROLE, _msgSender());
        _grantRole(QUEST_EXECUTOR_ROLE, _msgSender());
        _grantRole(QUEST_CREATOR_ROLE, _msgSender());
        requestNonce = 1;
        lastQuestId = 0;
    }

    function quest(uint256[] calldata tokenIds, uint256[] calldata questTypeIds)
        external
        onlyRole(QUEST_EXECUTOR_ROLE)
    {
        uint256 tokenId;
        uint256 questTypeId;
        QuestMetadata storage currentQuest;
        Cooldown memory questCooldown;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            questTypeId = questTypeIds[i];
            currentQuest = availableQuests[questTypeId];
            questCooldown = tokenQuestCooldowns[tokenId][questTypeId];

            require(
                block.timestamp < currentQuest.activeUntil,
                "!active || !exists"
            );
            require(!isQuesting(tokenId), "questing");
            require(questCooldown.endsAt < block.timestamp, "cooldown");

            requestNonce++;

            tokenQuests[tokenId].questId = currentQuest.questId;
            tokenQuests[tokenId].startAt = block.timestamp;
            tokenQuests[tokenId].endAt =
                block.timestamp +
                currentQuest.duration;
            tokenQuests[tokenId].seed = pseudorandom(tokenId);

            // Set cooldown period
            tokenQuestCooldowns[tokenId][questTypeId].endsAt =
                tokenQuests[tokenId].endAt +
                currentQuest.cooldownPeriod;

            emit QuestStart(
                tokenId,
                currentQuest.questId,
                currentQuest.name,
                tokenQuests[tokenId].startAt,
                tokenQuests[tokenId].endAt,
                tokenQuests[tokenId].seed
            );
        }
    }

    function endQuest(address _address, uint256[] calldata tokenIds)
        external
        override
        onlyRole(QUEST_EXECUTOR_ROLE)
    {
        uint256 tokenId;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];
            require(isQuesting(tokenId), "!questing");
            QuestMetadata memory currentQuest = availableQuests[
                tokenQuests[tokenId].questId
            ];
            uint256 duration = block.timestamp - tokenQuests[tokenId].startAt;
            if (tokenQuests[tokenId].endAt > block.timestamp) {
                // End quest early
                delete tokenQuests[tokenId];
                emit QuestEnd(
                    tokenId,
                    currentQuest.questId,
                    currentQuest.name,
                    duration,
                    block.timestamp,
                    0,
                    0,
                    0
                );
            } else {
                // Add to rewards to claim
                uint256 xpReward = currentQuest.xp;

                uint256 tokenReward = currentQuest.minCredits +
                    ((tokenQuests[tokenId].seed / 10) %
                        currentQuest.chanceCredits);

                Reward memory itemReward = seedToRewardDrop(
                    tokenQuests[tokenId].seed,
                    currentQuest.itemIds,
                    currentQuest.rarities
                );

                // Remove token id from quest
                delete tokenQuests[tokenId];

                emit QuestEnd(
                    tokenId,
                    currentQuest.questId,
                    currentQuest.name,
                    duration,
                    block.timestamp,
                    xpReward,
                    tokenReward,
                    itemReward.tokenId
                );

                // Add to rewards to claim

                // XP
                rewardsToClaim[_address].push(Reward(tokenId, xpReward, "XP"));

                // $CREDITS
                rewardsToClaim[_address].push(
                    Reward(tokenId, tokenReward, "CREDIT")
                );

                // Shop Item Drop
                if (itemReward.tokenId > 0) {
                    rewardsToClaim[_address].push(itemReward);
                }
            }
        }
    }

    /// @notice Resets a users current rewards to claim
    function emptyClaimableRewards(address _address)
        external
        override
        onlyRole(QUEST_EXECUTOR_ROLE)
    {
        delete rewardsToClaim[_address];
    }

    function seedToRewardDrop(
        uint256 seed,
        uint256[] memory itemIds,
        uint256[] memory rarities
    ) internal view returns (Reward memory) {
        Reward memory itemReward;
        uint256 randomness = (seed / 10000);
        uint256 chance = (randomness % 10000) + 1; // 1 - 10000
        for (uint256 i; i < rarities.length; i++) {
            if (chance < rarities[i]) {
                itemReward.tokenId = itemIds[i];
                break;
            }
        }
        itemReward.amount = 1;
        itemReward.typeOf = "SHOP";
        return itemReward;
    }

    function getAllQuests()
        external
        view
        override
        returns (QuestMetadata[] memory)
    {
        require(lastQuestId > 0, "No quests set");
        QuestMetadata[] memory allQuests = new QuestMetadata[](lastQuestId);
        for (uint256 i = 0; i < lastQuestId; i++) {
            allQuests[i] = availableQuests[i];
        }
        return allQuests;
    }

    function getActiveQuests()
        external
        view
        override
        returns (QuestMetadata[] memory)
    {
        require(lastQuestId > 0, "No quests set");
        uint256 activeQuestAmount = 0;
        for (uint256 i = 0; i < lastQuestId; i++) {
            if (block.timestamp < availableQuests[i].activeUntil) {
                activeQuestAmount++;
            }
        }
        QuestMetadata[] memory activeQuests = new QuestMetadata[](
            activeQuestAmount
        );
        for (uint256 j = 0; j < activeQuestAmount; j++) {
            if (block.timestamp < availableQuests[j].activeUntil) {
                activeQuests[j] = availableQuests[j];
            }
        }
        return activeQuests;
    }

    function addQuest(QuestMetadata memory currentQuest)
        external
        override
        onlyRole(QUEST_CREATOR_ROLE)
    {
        require(currentQuest.duration > 0, "Duration must be greater than 0");
        require(
            currentQuest.activeUntil > block.timestamp,
            "Cannot be active less than current timestamp"
        );
        require(
            currentQuest.itemIds.length == currentQuest.rarities.length,
            "Invalid length of items and rarities"
        );
        uint256 nextId = lastQuestId++;
        availableQuests[nextId] = QuestMetadata({
            questId: nextId,
            questType: currentQuest.questType,
            name: currentQuest.name,
            description: currentQuest.description,
            duration: currentQuest.duration,
            minCredits: currentQuest.minCredits,
            chanceCredits: currentQuest.chanceCredits,
            xp: currentQuest.xp,
            cooldownPeriod: currentQuest.cooldownPeriod,
            activeUntil: currentQuest.activeUntil,
            rarities: currentQuest.rarities,
            itemIds: currentQuest.itemIds
        });
    }

    function updateQuest(QuestMetadata calldata _quest)
        external
        override
        onlyRole(QUEST_CREATOR_ROLE)
    {
        require(_quest.questId < lastQuestId, "Invalid quest id");
        require(_quest.duration > 0, "Duration must be greater than 0");
        availableQuests[_quest.questId] = _quest;
    }

    /**
     * @notice Sets item config for a given quest id
     * @param _itemIds An array of shop drop item ids
     * @param _rarities An array of rarities linked to the shop items
     */
    function setQuestItemConfig(
        uint256 _questId,
        uint256[] calldata _itemIds,
        uint256[] calldata _rarities
    ) external onlyRole(QUEST_CREATOR_ROLE) {
        require(_questId < lastQuestId, "Invalid quest id");
        require(
            _itemIds.length == _rarities.length,
            "Invalid length of items and rarities"
        );
        availableQuests[_questId].itemIds = _itemIds;
        availableQuests[_questId].rarities = _rarities;
    }

    /**
     * @notice Sets the quest active timestamp
     * @param _questId The quest id
     * @param _activeUntil Unix timestamp for activeness
     */
    function setQuestActiveUntil(uint256 _questId, uint256 _activeUntil)
        external
        override
        onlyRole(QUEST_CREATOR_ROLE)
    {
        require(_questId < lastQuestId, "Invalid quest id");
        availableQuests[_questId].activeUntil = _activeUntil;
    }

    /**
     * @notice Gets the current item rewards for an address
     * @param _address - The address of claimer
     */
    function getClaimableItems(address _address)
        external
        view
        override
        returns (Reward[] memory)
    {
        Reward[] memory userRewards = rewardsToClaim[_address];
        Reward[] memory itemsToClaim = new Reward[](userRewards.length);
        Reward memory currentReward;

        bytes32 itemTypeOf;
        uint256 itemsIndex = 0;

        for (uint256 i = 0; i < userRewards.length; i++) {
            currentReward = userRewards[i];
            itemTypeOf = keccak256(abi.encodePacked(currentReward.typeOf));
            if (itemTypeOf == SHOP_ITEM) {
                itemsToClaim[itemsIndex++] = currentReward;
            }
        }

        return itemsToClaim;
    }

    /**
     * @notice Gets the current rewards the caller can claim
     * @param _address - The address of claimer
     */
    function getClaimableRewards(address _address)
        external
        view
        override
        returns (Reward[] memory)
    {
        return rewardsToClaim[_address];
    }

    /**
     * @notice Gets the quest struct for a tokenId
     * @param _tokenId - The token id of the item
     */
    function getQuestData(uint256 _tokenId)
        external
        view
        override
        returns (Quest memory)
    {
        return tokenQuests[_tokenId];
    }

    /**
     * @notice Gets the quest metadata for questTypeId
     * @param _questTypeId - The id of the quest
     */
    function getQuestMetadata(uint256 _questTypeId)
        external
        view
        override
        returns (QuestMetadata memory)
    {
        return availableQuests[_questTypeId];
    }

    /**
     * @notice Returns whether a token is currently on cooldown from a quest
     * @param _tokenIds - The token ids of the nft
     * @param _questTypeIds - The token ids of the quests
     */
    function tokenQuestCooldownBatch(
        uint256[] calldata _tokenIds,
        uint256[] calldata _questTypeIds
    ) public view override returns (Cooldown[] memory) {
        uint256 size = _tokenIds.length;
        Cooldown[] memory cooldowns = new Cooldown[](size);
        for (uint256 i; i < size; i++) {
            cooldowns[i] = tokenQuestCooldowns[_tokenIds[i]][_questTypeIds[i]];
        }
        return cooldowns;
    }

    /**
     * @notice Returns the cooldown for a token and quest type id
     * @param tokenId - The token id of the item
     * @param questTypeId - The token id of the quest
     */
    function tokenQuestCooldown(uint256 tokenId, uint256 questTypeId)
        public
        view
        override
        returns (Cooldown memory)
    {
        return tokenQuestCooldowns[tokenId][questTypeId];
    }

    /**
     * @notice Returns whether a token is currently questing
     * @param tokenId - The token id of the item
     */
    function isQuesting(uint256 tokenId) public view override returns (bool) {
        return tokenQuests[tokenId].startAt > 0;
    }

    /// @dev TODO: Bastardized "randomness", replace with Chainlink VRF once POC is done in new contract
    function pseudorandom(uint256 tokenId) private view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.number,
                        block.difficulty,
                        block.timestamp,
                        Strings.toString(tokenId),
                        Strings.toString(requestNonce)
                    )
                )
            );
    }
}
