# Brawler Bearz Blockchain

Public facing solidity contracts of the BB ecosystem

### Install
`npm i`

### Tasks
- `generate-bb-alias` - Auto generate `Genes.sol` based on a configuration of items

### Testing
`npx hardhat test --network hardhat`

### Main Contracts
- `BrawlerBearzAccessPass.sol`
  - ERC721A access pass NFT. Used pre-mint for claiming a free Bearz NFT
- `BrawlerBearzFactions.sol`
  - ERC1155 Soul bound token implement. Used for associating a wallet to one of the 4 primary factions.
- `BrawlerBearzRenderer.sol`
  - On-chain metadata rendering contract. Exposes `tokenURI` which accepts `CustomMetadata` and derives a base64 encoded json string for metadata. Defines a base image and animation uri for dynamic image generation.
- `BrawlerBearz.sol`
    - The official brawler bearz dynamic NFT. ERC721PSI, with chainlink VRF integration.
- `BrawlerBearzShop.sol`
  - The dynamic equip-able item shop for Brawler Bearz NFTs. There are 6 types of items: Weapon, Armor, Face Armor, Eyewear, Background, and Miscellanous.
- `BrawlerBearzStake.sol`
  - The staking contract that leverages the Brawler Bearz NFT lock registry for asset management. Staking system syncs data down to an L2 chain, Polygon. The training, questing, and claims of $CREDIT will occur on Polygon for transaction costs.
- `BrawlerBearzChildStake.sol`
  - The child contract for staking that is on Polygon. This will house the synced NFT data from a stake related to the token. Questing and training framework will happen at this level.
- `BrawlerBearzQuesting.sol`
  - The upgradeable questing contract on Polygon. This will house the questing logic and chance game.
- `BrawlerBearzBattle.sol`
  - The upgradeable battle contract on Polygon. This will house the battle CRUD~~~~.
- `CreditUtilityToken.sol`
  - The $CREDIT utility token on the Polygon blockchain
- `Genes.sol`
  - Auto-generated file that leverages an off-chain AJ walker algorithm for O(1) selection
