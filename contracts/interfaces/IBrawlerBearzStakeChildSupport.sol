//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBrawlerBearzStakeChildSupport {
    function getStakedTokens(address owner)
        external
        view
        returns (uint256[] memory);

    function balanceOf(address user) external view returns (uint256);

    function isTraining(uint256 tokenId) external view returns (bool);

    function isQuesting(uint256 tokenId) external view returns (bool);

    function getXP(uint256 tokenId) external view returns (uint256);

    function setTokenXP(uint256 _tokenId, uint256 _xp) external;
}
