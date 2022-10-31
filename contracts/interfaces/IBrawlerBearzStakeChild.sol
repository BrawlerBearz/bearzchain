//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IBrawlerBearzQuestCommon} from "./IBrawlerBearzQuestCommon.sol";

interface IBrawlerBearzStakeChild is IBrawlerBearzQuestCommon {
    struct State {
        bool isTraining;
        bool isQuesting;
        uint256 syncXP;
        Train training;
        Quest quest;
        QuestMetadata questMetadata;
    }

    struct Stake {
        uint256 amount;
        uint256 claimedAt;
        uint256[] tokenIds;
        bool hasClaimed;
    }

    struct TokenXP {
        uint256 xp;
        uint256 lastUpdatedAt;
    }

    struct Train {
        uint256 xp;
        uint256 startAt;
        uint256 endAt;
    }

    function getStateBatch(uint256[] calldata tokenIds)
        external
        view
        returns (State[] memory);
}
