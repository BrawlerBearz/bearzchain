// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBrawlerBearzQuestCommon {
    struct Reward {
        uint256 tokenId;
        uint256 amount;
        string typeOf;
    }

    struct QuestMetadata {
        uint256 questId;
        string questType;
        string name;
        string description;
        uint256 duration;
        uint256 minCredits;
        uint256 chanceCredits;
        uint256 xp;
        uint256 activeUntil;
        uint256 cooldownPeriod;
        uint256[] rarities;
        uint256[] itemIds;
    }

    struct Quest {
        uint256 questId;
        uint256 xp;
        uint256 startAt;
        uint256 endAt;
        uint256 seed;
    }

    struct Cooldown {
        uint256 questId;
        uint256 endsAt;
    }

    event QuestStart(
        uint256 tokenId,
        uint256 questId,
        string name,
        uint256 startAt,
        uint256 endAt,
        uint256 seed
    );

    event QuestEnd(
        uint256 tokenId,
        uint256 questId,
        string name,
        uint256 duration,
        uint256 endAt,
        uint256 xpReward,
        uint256 creditReward,
        uint256 itemIdFound
    );
}
