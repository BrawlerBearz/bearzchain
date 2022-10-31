// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IBrawlerBearzBattleCommon} from "./IBrawlerBearzBattleCommon.sol";

interface IBrawlerBearzBattle is IBrawlerBearzBattleCommon {
    function create(
        BattleConfig calldata config,
        StatSnap calldata stats,
        DynamicItems calldata items
    ) external;

    function join(
        uint256 _battleId,
        uint256 _opponentTokenId,
        uint256 _opponentLevel,
        StatSnap calldata stats,
        DynamicItems calldata items
    ) external;

    function setBattleWinner(
        uint256 _battleId,
        BattleOutcome memory _outcome,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function cancel(uint256 battleId) external;

    function setStakeContract(address _stakeContract) external;

    function setRewardsToken(address _rewardsToken) external;

    function setTrustedSigner(address _trustedSigner) external;

    function setBattleFee(uint256 _battleFee) external;

    function setBattleXPYield(uint256 _winningXPYield, uint256 _losingXPYield)
        external;

    function setPaused(bool _isPaused) external;

    function withdraw(uint256 _amount) external;

    function addFunds(uint256 _amount) external;

    function cleanupBattles(uint256 _battleId) external;

    function getBattle(uint256 _battleId) external view returns (Battle memory);

    function getBattleSnapshot(uint256 _battleId)
        external
        view
        returns (BattleSnapshot memory);

    function cleanupCooldown(uint256 _tokenId) external;

    function getBattleBatch(uint256[] calldata _battleIds)
        external
        view
        returns (Battle[] memory);

    function getBattlePages(uint256 page, uint256 size)
        external
        view
        returns (Battle[] memory);

    function getBattleCooldowns(uint256[] calldata _tokenIds)
        external
        view
        returns (BattleCooldown[] memory);
}
