// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IBrawlerBearzQuestCommon} from "./IBrawlerBearzQuestCommon.sol";

interface IBrawlerBearzQuesting is IBrawlerBearzQuestCommon {
    function quest(uint256[] calldata tokenIds, uint256[] calldata questTypeIds)
        external;

    function endQuest(address _address, uint256[] calldata tokenIds) external;

    function emptyClaimableRewards(address _address) external;

    function getAllQuests() external view returns (QuestMetadata[] memory);

    function getActiveQuests() external view returns (QuestMetadata[] memory);

    function getClaimableRewards(address _address)
        external
        view
        returns (Reward[] memory);

    function getClaimableItems(address _address)
        external
        view
        returns (Reward[] memory);

    function addQuest(QuestMetadata calldata addQuest) external;

    function updateQuest(QuestMetadata calldata updateQuest) external;

    function setQuestItemConfig(
        uint256 questId,
        uint256[] calldata _itemIds,
        uint256[] calldata _rarities
    ) external;

    function setQuestActiveUntil(uint256 questId, uint256 activeUntil) external;

    function getQuestData(uint256 tokenId) external view returns (Quest memory);

    function getQuestMetadata(uint256 questTypeId)
        external
        view
        returns (QuestMetadata memory);

    function isQuesting(uint256 tokenId) external view returns (bool);

    function tokenQuestCooldownBatch(
        uint256[] calldata tokenIds,
        uint256[] calldata questTypeIds
    ) external view returns (Cooldown[] memory);

    function tokenQuestCooldown(uint256 tokenId, uint256 questTypeId)
        external
        view
        returns (Cooldown memory);
}
