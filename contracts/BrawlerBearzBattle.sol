// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC2771ContextUpgradeable, ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import {MinimalForwarderUpgradeable} from "@openzeppelin/contracts-upgradeable/metatx/MinimalForwarderUpgradeable.sol";
import {EIP712Upgradeable, ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20RewardsUpgradeable} from "./interfaces/IERC20RewardsUpgradeable.sol";
import {IBrawlerBearzBattle} from "./interfaces/IBrawlerBearzBattle.sol";
import {IBrawlerBearzStakeChildSupport} from "./interfaces/IBrawlerBearzStakeChildSupport.sol";

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
 * @title BrawlerBearzBattle
 * @author @ScottMitchell18
 **************************************************/

contract BrawlerBearzBattle is
    EIP712Upgradeable,
    ERC2771ContextUpgradeable,
    AccessControlUpgradeable,
    IBrawlerBearzBattle,
    MinimalForwarderUpgradeable,
    ReentrancyGuardUpgradeable
{
    using StringsUpgradeable for string;
    using SafeMathUpgradeable for uint256;

    uint256 private constant MAX_INT =
        115792089237316195423570985008687907853269984665640564039457584007913129639935;

    /// @dev Role types
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    bytes32 public constant BATTLE_MODERATOR_ROLE =
        keccak256("BATTLE_MODERATOR_ROLE");

    bytes32 public constant BATTLE_EXECUTOR_ROLE =
        keccak256("BATTLE_EXECUTOR_ROLE");

    bytes32 private constant BATTLE_END_MESSAGE =
        keccak256(
            "BattleEnded(uint256 battleId,address winnerAddress,uint256 winnerTokenId,uint256 loserTokenId,uint256 wager,uint256 seed)"
        );

    /// @notice nonce for claim requests
    uint256 private requestNonce;

    /// @notice Battle fee basis percent
    uint256 public basisPoints;
    uint256 public battleFee;

    /// @notice Last battle id
    uint256 public lastBattleId;

    /// @notice Trusted signer
    address private trustedSigner;

    /// @dev Battle id to battle
    mapping(uint256 => Battle) public battles;

    /// @notice erc20 payment token
    IERC20RewardsUpgradeable public rewardsToken;

    /// @notice The staking contract
    IBrawlerBearzStakeChildSupport public stakeContract;

    /// @notice The yield of XP when you win - added v1.1
    uint256 public winningXPYield;

    /// @notice The yield of XP when you lose - added v1.1
    uint256 public losingXPYield;

    /// @notice The version of the contract for typed domain signatures
    string public version;

    /// @dev Battle id to battle
    mapping(uint256 => BattleCooldown) public battleCooldowns;

    /// @notice Ability to pause any create or join actions in the arena
    bool public isPaused;

    /// @dev Battle id to battle snapshot
    mapping(uint256 => BattleSnapshot) public battleSnapshots;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _trustedForwarder)
        ERC2771ContextUpgradeable(_trustedForwarder)
    {}

    modifier isTokenOwner(address owner, uint256 tokenId) {
        if (!_checkTokenOwnership(owner, tokenId)) {
            revert("Token must be staked by owner");
        }
        _;
    }

    modifier canBattle(uint256 tokenId) {
        if (
            stakeContract.isTraining(tokenId) ||
            stakeContract.isQuesting(tokenId) ||
            battleCooldowns[tokenId].isLocked
        ) {
            revert(
                "Training, questing, or battling at the moment, cannot use this token!"
            );
        }
        _;
    }

    modifier isNotPaused() {
        if (isPaused) {
            revert("Arena is in maintenance mode");
        }
        _;
    }

    function initialize(address _token, address _stakeContract)
        public
        initializer
    {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __EIP712_init("Brawler Bearz Arena", "1.1");

        // Roles
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(OWNER_ROLE, _msgSender());
        _grantRole(BATTLE_MODERATOR_ROLE, _msgSender());
        _grantRole(BATTLE_EXECUTOR_ROLE, _msgSender());

        // Battle init
        lastBattleId = 0;
        basisPoints = 100;
        battleFee = 10;

        // Integration contracts
        rewardsToken = IERC20RewardsUpgradeable(_token);
        rewardsToken.approve(address(this), MAX_INT);
        stakeContract = IBrawlerBearzStakeChildSupport(_stakeContract);

        // Set trusted signer
        trustedSigner = _msgSender();

        // v1.1 add
        winningXPYield = 300;
        losingXPYield = 100;

        version = "";
    }

    /*
     * @notice Create a new battle
     * @param config - The config for the battle
     * @param snapshot - The snapshot of of stats
     * @param items - The items for the battle
     */
    function create(
        BattleConfig calldata config,
        StatSnap calldata snapshot,
        DynamicItems calldata items
    )
        external
        override
        isNotPaused
        isTokenOwner(_msgSender(), config.hostTokenId)
        canBattle(config.hostTokenId)
        nonReentrant
    {
        require(
            config.expiresAt > config.startsAt,
            "Expiry time should be after start time."
        );

        uint256 nextId = lastBattleId++;

        // Transfer token to escrow
        if (config.wagerAmount > 0) {
            rewardsToken.transferFrom(
                _msgSender(),
                address(this),
                config.wagerAmount
            );
        }

        require(
            snapshot.tokenId == config.hostTokenId,
            "Snapshot has invalid token id"
        );

        // Create new battle instance
        battles[nextId] = Battle({
            battleId: nextId,
            hostAddress: _msgSender(),
            hostTokenId: config.hostTokenId,
            opponentAddress: address(0),
            opponentTokenId: 0,
            wager: config.wagerAmount,
            startsAt: config.startsAt,
            expiresAt: config.expiresAt,
            completedAt: 0,
            outcome: BattleOutcome({
                winnerAddress: address(this),
                winnerTokenId: 0,
                loserTokenId: 0,
                seed: 0
            }),
            isCanceled: false,
            maxOpponentLevel: config.maxOpponentLevel
        });

        battleSnapshots[nextId] = BattleSnapshot({
            host: StatSnap({
                tokenId: snapshot.tokenId,
                str: snapshot.str,
                end: snapshot.end,
                intel: snapshot.intel,
                lck: snapshot.lck,
                hp: snapshot.hp
            }),
            hostItems: DynamicItems({
                backgroundId: items.backgroundId,
                weaponId: items.weaponId,
                armorId: items.armorId,
                faceArmorId: items.faceArmorId,
                eyewearId: items.eyewearId,
                miscId: items.miscId,
                headId: items.headId
            }),
            opponent: StatSnap({
                tokenId: 0,
                str: 0,
                end: 0,
                intel: 0,
                lck: 0,
                hp: 0
            }),
            opponentItems: DynamicItems({
                backgroundId: 0,
                weaponId: 0,
                armorId: 0,
                faceArmorId: 0,
                eyewearId: 0,
                miscId: 0,
                headId: 0
            })
        });

        // Lockdown bear on cooldown
        battleCooldowns[config.hostTokenId] = BattleCooldown({
            battleId: nextId,
            isLocked: true
        });

        emit BattleCreated(
            nextId,
            _msgSender(),
            config.hostTokenId,
            config.wagerAmount,
            config.startsAt,
            config.expiresAt,
            config.maxOpponentLevel
        );
    }

    /*
     * @notice Joins a battle
     * @param _battleId - The id of the hosted battle
     * @param _opponentTokenId - The opponent bear token id
     * @param _opponentLevel - The opponents level
     */
    function join(
        uint256 _battleId,
        uint256 _opponentTokenId,
        uint256 _opponentLevel,
        StatSnap calldata snapshot,
        DynamicItems calldata items
    )
        external
        override
        isNotPaused
        isTokenOwner(_msgSender(), _opponentTokenId)
        canBattle(_opponentTokenId)
        nonReentrant
    {
        require(_battleId < lastBattleId, "Battle does not exist");

        Battle storage instance = battles[_battleId];

        require(
            _opponentLevel <= instance.maxOpponentLevel,
            "Cannot join due to max level restriction"
        );
        require(
            instance.opponentTokenId == 0,
            "Opponent has already joined, cannot join!"
        );
        require(
            instance.hostTokenId != _opponentTokenId,
            "Cannot battle same bear"
        );
        require(
            instance.hostAddress != _msgSender(),
            "Cannot battle your own bearz"
        );
        require(block.timestamp > instance.startsAt, "Battle is not live yet");
        require(block.timestamp < instance.expiresAt, "Battle has expired");
        require(
            instance.outcome.winnerTokenId == 0 && instance.completedAt == 0,
            "Winner has been decided!"
        );

        // Transfer token to escrow
        if (instance.wager > 0) {
            rewardsToken.transferFrom(
                _msgSender(),
                address(this),
                instance.wager
            );
        }

        require(
            snapshot.tokenId == _opponentTokenId,
            "Snapshot has invalid token id"
        );

        instance.opponentAddress = _msgSender();
        instance.opponentTokenId = _opponentTokenId;

        // Add opponent snapshot
        battleSnapshots[_battleId].opponent = StatSnap({
            tokenId: snapshot.tokenId,
            str: snapshot.str,
            end: snapshot.end,
            intel: snapshot.intel,
            lck: snapshot.lck,
            hp: snapshot.hp
        });

        battleSnapshots[_battleId].opponentItems = DynamicItems({
            backgroundId: items.backgroundId,
            weaponId: items.weaponId,
            armorId: items.armorId,
            faceArmorId: items.faceArmorId,
            eyewearId: items.eyewearId,
            miscId: items.miscId,
            headId: items.headId
        });

        // Lockdown bear on cooldown
        battleCooldowns[_opponentTokenId] = BattleCooldown({
            battleId: _battleId,
            isLocked: true
        });

        emit BattleJoined(_battleId, _opponentTokenId);
    }

    function getWinnerSigner(
        uint256 battleId,
        uint256 wager,
        BattleOutcome memory _outcome,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(
                BATTLE_END_MESSAGE,
                battleId,
                _outcome.winnerAddress,
                _outcome.winnerTokenId,
                _outcome.loserTokenId,
                wager,
                _outcome.seed
            )
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSAUpgradeable.recover(hash, v, r, s);
        return signer;
    }

    /*
     * @notice Sets and determines the battle winner from a trusted outsider signer
     * @param _battleId - The id of the hosted battle
     * @param _outcome - The outcome tuple of the battle
     * @param v
     * @param r
     * @param s
     */
    function setBattleWinner(
        uint256 _battleId,
        BattleOutcome memory _outcome,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override onlyRole(BATTLE_EXECUTOR_ROLE) {
        require(_battleId < lastBattleId, "Battle does not exist");

        Battle storage instance = battles[_battleId];

        require(
            instance.outcome.winnerTokenId == 0 && instance.completedAt == 0,
            "Winner has been decided!"
        );

        // TODO: Bring back later
        //        address signer = getWinnerSigner(
        //            _battleId,
        //            instance.wager,
        //            _outcome,
        //            v,
        //            r,
        //            s
        //        );
        //
        //        require(
        //            signer == trustedSigner,
        //            "BrawlerBearzBattle: INVALID_SIGNATURE"
        //        );

        instance.outcome = _outcome;
        instance.completedAt = block.timestamp;

        uint256 winnerReward = 0;

        if (instance.wager > 0) {
            uint256 totalReward = instance.wager.mul(2);
            uint256 burnableFee = totalReward.mul(battleFee).div(basisPoints);
            winnerReward = totalReward.mul(basisPoints - battleFee).div(
                basisPoints
            );

            // Transfer token from escrow to winners
            rewardsToken.transferFrom(
                address(this),
                _outcome.winnerAddress,
                winnerReward
            );

            // Burn fee
            rewardsToken.burn(address(this), burnableFee);
        }

        // Add XP yields for tokens involved
        uint256 winningXP = stakeContract.getXP(_outcome.winnerTokenId);
        uint256 losingXP = stakeContract.getXP(_outcome.loserTokenId);

        // Set winner XP increase
        stakeContract.setTokenXP(
            _outcome.winnerTokenId,
            winningXP + winningXPYield
        );

        // Set loser XP increase
        stakeContract.setTokenXP(
            _outcome.loserTokenId,
            losingXP + losingXPYield
        );

        // Release both tokens from cooldown
        battleCooldowns[_outcome.winnerTokenId] = BattleCooldown({
            battleId: 0,
            isLocked: false
        });

        battleCooldowns[_outcome.loserTokenId] = BattleCooldown({
            battleId: 0,
            isLocked: false
        });

        // Verify signature is from a trusted signer
        emit BattleEnded(
            _battleId,
            _outcome.winnerAddress,
            _outcome.winnerTokenId,
            _outcome.loserTokenId,
            winnerReward
        );
    }

    /*
     * @notice Cancels a battle
     * @param _battleId - The id of the hosted battle
     */
    function cancel(uint256 _battleId) external override nonReentrant {
        require(_battleId < lastBattleId, "Battle does not exist");

        Battle storage instance = battles[_battleId];

        require(
            instance.hostAddress == _msgSender() ||
                trustedSigner == _msgSender(),
            "Battle is not owned by host"
        );
        require(
            instance.opponentTokenId == 0,
            "Opponent has already joined, cannot cancel!"
        );
        require(
            instance.outcome.winnerTokenId == 0 && instance.completedAt == 0,
            "Winner has been decided!"
        );

        if (instance.wager > 0) {
            // Transfer token back to creator of battle
            rewardsToken.transferFrom(
                address(this),
                instance.hostAddress,
                instance.wager
            );
        }

        // Release token from cooldown
        battleCooldowns[instance.hostTokenId] = BattleCooldown({
            battleId: 0,
            isLocked: false
        });

        // Reset battle
        instance.hostTokenId = 0;
        instance.hostAddress = address(0);
        instance.expiresAt = 0;
        instance.completedAt = block.timestamp;
        instance.isCanceled = true;

        // Remove snapshot
        delete battleSnapshots[_battleId];

        emit BattleCanceled(_battleId);
    }

    /*
     * @notice Checks the ownership of a particular owner and token id
     * @param _owner - The owner address to check
     * @param _tokenId - The token id to check
     */
    function _checkTokenOwnership(address _owner, uint256 _tokenId)
        internal
        returns (bool)
    {
        uint256 tokenBalance = stakeContract.balanceOf(_owner);
        uint256[] memory ownedTokens = stakeContract.getStakedTokens(_owner);
        uint256 currentToken;
        for (uint256 i = 0; i < tokenBalance; i++) {
            currentToken = ownedTokens[i];
            if (currentToken == _tokenId) {
                return true;
            }
        }
        return false;
    }

    /*
     * @notice Sets the yield values for XP in a battle
     * @param _winningXPYield - The amount of XP to gain when winning
     * @param _losingXPYield - The amount of XP to gain when losing
     */
    function setBattleXPYield(uint256 _winningXPYield, uint256 _losingXPYield)
        external
        override
        onlyRole(OWNER_ROLE)
    {
        winningXPYield = _winningXPYield;
        losingXPYield = _losingXPYield;
    }

    /*
     * @notice Sets the stake contract reference
     * @param _stakeContract - The address of the staking contract
     */
    function setStakeContract(address _stakeContract)
        external
        override
        onlyRole(OWNER_ROLE)
    {
        stakeContract = IBrawlerBearzStakeChildSupport(_stakeContract);
    }

    /*
     * @notice Sets the battle fee
     * @param _battleFee - The fee of a battle
     */
    function setBattleFee(uint256 _battleFee)
        external
        override
        onlyRole(OWNER_ROLE)
    {
        require(
            _battleFee > 0 && _battleFee < basisPoints + 1,
            "Invalid range for battle fee"
        );
        battleFee = _battleFee;
    }

    /*
     * @notice Sets the rewards token contract
     * @param _rewardsToken - The rewards token
     */
    function setRewardsToken(address _rewardsToken)
        external
        override
        onlyRole(OWNER_ROLE)
    {
        rewardsToken = IERC20RewardsUpgradeable(_rewardsToken);
        rewardsToken.approve(address(this), MAX_INT);
    }

    /*
     * @notice Sets whether the arena is paused
     * @param _isPaused - The status of the arena
     */
    function setPaused(bool _isPaused) external override onlyRole(OWNER_ROLE) {
        isPaused = _isPaused;
    }

    /*
     * @notice Sets the trusted signer
     * @param _trustedSigner - The address of the trusted signer
     */
    function setTrustedSigner(address _trustedSigner)
        external
        override
        onlyRole(OWNER_ROLE)
    {
        trustedSigner = _trustedSigner;
    }

    /*
     * @notice Delete battle
     * @param _battleId - The battle id to clear
     */
    function cleanupBattles(uint256 _battleId)
        public
        override
        onlyRole(OWNER_ROLE)
    {
        delete battles[_battleId];
    }

    /*
     * @notice Delete cooldown
     * @param _tokenId - The battle id to clear
     */
    function cleanupCooldown(uint256 _tokenId)
        public
        override
        onlyRole(OWNER_ROLE)
    {
        delete battleCooldowns[_tokenId];
    }

    /*
     * @notice Withdraws escrow funds from contract
     * @param _amount - The amount of funds to withdraw
     */
    function withdraw(uint256 _amount) public override onlyRole(OWNER_ROLE) {
        rewardsToken.transferFrom(address(this), _msgSender(), _amount);
    }

    /*
     * @notice Adds funds into the contract
     * @param _amount - The amount of funds to add
     */
    function addFunds(uint256 _amount) public override onlyRole(OWNER_ROLE) {
        rewardsToken.transferFrom(_msgSender(), address(this), _amount);
    }

    function getBattle(uint256 _battleId)
        external
        view
        override
        returns (Battle memory)
    {
        return battles[_battleId];
    }

    function getBattleSnapshot(uint256 _battleId)
        external
        view
        override
        returns (BattleSnapshot memory)
    {
        return battleSnapshots[_battleId];
    }

    function getBattleBatch(uint256[] calldata _battleIds)
        external
        view
        override
        returns (Battle[] memory)
    {
        require(_battleIds.length > 0, "0");
        Battle[] memory battleBatch = new Battle[](_battleIds.length);
        for (uint256 i = 0; i < _battleIds.length; i++) {
            battleBatch[i] = battles[_battleIds[i]];
        }
        return battleBatch;
    }

    function getBattlePages(uint256 page, uint256 size)
        external
        view
        override
        returns (Battle[] memory)
    {
        uint256 increment = page * size;
        Battle[] memory battleBatch = new Battle[](size);
        for (uint256 i = 0; i < size; i++) {
            battleBatch[i] = battles[i + increment];
        }
        return battleBatch;
    }

    function getBattleCooldowns(uint256[] calldata _tokenIds)
        external
        view
        override
        returns (BattleCooldown[] memory)
    {
        require(_tokenIds.length > 0, "0");
        BattleCooldown[] memory battleBatch = new BattleCooldown[](
            _tokenIds.length
        );
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            battleBatch[i] = battleCooldowns[_tokenIds[i]];
        }
        return battleBatch;
    }

    function _msgSender()
        internal
        view
        virtual
        override(ERC2771ContextUpgradeable, ContextUpgradeable)
        returns (address)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ERC2771ContextUpgradeable, ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }

    function versionRecipient() external view returns (string memory) {
        return "1.2";
    }
}
