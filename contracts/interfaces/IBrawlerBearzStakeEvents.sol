//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBrawlerBearzStakeEvents {
    event RewardClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event TrainStart(uint256 tokenId, uint256 startAt);

    event TrainEnd(
        uint256 tokenId,
        uint256 xpReward,
        uint256 startAt,
        uint256 endAt
    );
}
