// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBrawlerBearzBattleCommon {
    struct DynamicItems {
        uint256 backgroundId;
        uint256 weaponId;
        uint256 armorId;
        uint256 faceArmorId;
        uint256 eyewearId;
        uint256 miscId;
        uint256 headId;
    }

    struct StatSnap {
        uint256 tokenId;
        uint256 str;
        uint256 end;
        uint256 intel;
        uint256 lck;
        uint256 hp;
    }

    struct BattleConfig {
        uint256 hostTokenId;
        uint256 wagerAmount;
        uint256 startsAt;
        uint256 expiresAt;
        uint256 maxOpponentLevel;
    }

    struct BattleSnapshot {
        StatSnap host;
        DynamicItems hostItems;
        StatSnap opponent;
        DynamicItems opponentItems;
    }

    struct Battle {
        uint256 battleId;
        address hostAddress;
        uint256 hostTokenId;
        address opponentAddress;
        uint256 opponentTokenId;
        uint256 startsAt;
        uint256 expiresAt;
        uint256 completedAt;
        uint256 wager;
        BattleOutcome outcome;
        bool isCanceled;
        uint256 maxOpponentLevel;
    }

    struct BattleCooldown {
        uint256 battleId;
        bool isLocked;
    }

    struct BattleOutcome {
        address winnerAddress;
        uint256 winnerTokenId;
        uint256 loserTokenId;
        uint256 seed;
    }

    event BattleCreated(
        uint256 indexed battleId,
        address hostTokenAddress,
        uint256 hostTokenId,
        uint256 wagerAmount,
        uint256 startsAt,
        uint256 expiresAt,
        uint256 maxOpponentLevel
    );

    event BattleJoined(uint256 indexed battleId, uint256 opponentTokenId);

    event BattleCanceled(uint256 indexed battleId);

    event BattleEnded(
        uint256 indexed battleId,
        address winnerAddress,
        uint256 winnerTokenId,
        uint256 loserTokenId,
        uint256 winnerReward
    );
}
