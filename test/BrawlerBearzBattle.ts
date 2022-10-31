import { expect } from "chai";
import hre, { ethers, upgrades } from "hardhat";

describe("Brawler Bearz Battle Arena", function () {
  let owner;
  let alice;
  let bob;
  let childStake;
  let bbBattle;
  let erc20Token;
  const trustedForwarder = "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b"; // biconomy
  const MAX_INT =
    "115792089237316195423570985008687907853269984665640564039457584007913129639934"; // MAX INT - 1

  const startsAtBase = 1665633600;
  const expiresAtBase = 1665979200;
  const DAYS_ADV = 3;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    // DEPLOY ERC20 TOKEN
    const CreditUtilityToken = await hre.ethers.getContractFactory(
      "CreditUtilityToken"
    );
    erc20Token = await CreditUtilityToken.deploy();

    await erc20Token.deployTransaction.wait();

    console.log("$CREDIT token deployed to:", erc20Token.address);

    // DEPLOY STAKE CHILD CONTRACT
    const MockStakeChild = await hre.ethers.getContractFactory(
      "MockStakeChild"
    );

    childStake = await MockStakeChild.deploy();

    await childStake.deployTransaction.wait();

    const BrawlerBearzBattle = await hre.ethers.getContractFactory(
      "BrawlerBearzBattle"
    );

    bbBattle = await upgrades.deployProxy(
      BrawlerBearzBattle,
      [erc20Token.address, childStake.address],
      {
        constructorArgs: [trustedForwarder],
        unsafeAllow: ["constructor"],
      }
    );

    console.log("Battles deployed to:", bbBattle.address);

    // Set token mint allowance
    const allowance = await erc20Token.updateMintAllowance(
      bbBattle.address,
      "100000000000000000000000"
    );

    await allowance.wait();
    console.log("Child stake deployed to:", childStake.address);

    // Seed some credits for owner
    const fundsTx = await erc20Token.mint(
      "10000000000000000000",
      owner.address
    );
    await fundsTx.wait();

    const fundsTx1 = await erc20Token.mint(
      "10000000000000000000",
      alice.address
    );
    await fundsTx1.wait();

    // Set approvals for the access pass
    const approvalTx = await erc20Token.approve(
      bbBattle.address,
      "100000000000000000000000"
    );
    await approvalTx.wait();

    // Set approvals for the access pass
    const approvalTx1 = await erc20Token
      .connect(alice)
      .approve(bbBattle.address, "100000000000000000000000");
    await approvalTx1.wait();

    const extRoleTx1 = await childStake.grantRole(
      "0xc3f95295c991a621e6fa86a63e69c6f087dfe5eb92a5552ea8b5df15705db1b5",
      bbBattle.address
    );
    await extRoleTx1.wait();
  });

  it("Staking logic", async function () {
    const stakeTx = await childStake.stake(
      owner.address,
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    );
    await stakeTx.wait();
    const stakeData = await childStake.stakes(owner.address);
    expect(stakeData.amount).to.be.equal(11);

    // Alice stake
    const stakeTx1 = await childStake
      .connect(alice)
      .stake(alice.address, [11, 12, 13]);
    await stakeTx1.wait();
    const stakeData1 = await childStake.stakes(alice.address);
    expect(stakeData1.amount).to.be.equal(3);
  });

  it("Unstaking logic", async function () {
    const unstakeTx = await childStake.unstake(owner.address, [9, 10]);
    await unstakeTx.wait();
    const stakeData2 = await childStake.stakes(owner.address);
    expect(stakeData2.amount).to.be.equal(9);
    const tokenIds = await childStake.getStakedTokens(owner.address);
    expect(tokenIds.length).to.be.equal(9);
    expect(tokenIds[0]).to.be.equal(0);
  });

  it("Start training and questing", async function () {
    const trainTx = await childStake.train([1, 2]);
    await trainTx.wait();
    expect(await childStake.isTraining(1)).to.be.equal(true);
    expect(await childStake.isTraining(2)).to.be.equal(true);
    expect(await childStake.isTraining(3)).to.be.equal(false);

    const questTx = await childStake.quest([3, 4]);
    await questTx.wait();
    expect(await childStake.isQuesting(1)).to.be.equal(false);
    expect(await childStake.isQuesting(3)).to.be.equal(true);
    expect(await childStake.isQuesting(4)).to.be.equal(true);
  });

  it("Create battle", async function () {
    const wagerAmount = ethers.utils.parseEther("5");

    await expect(
      bbBattle.create(
        [10, wagerAmount, startsAtBase, expiresAtBase, 999],
        [10, 100, 200, 5, 10, 300],
        [1, 2, 3, 4, 5, 6, 7]
      )
    ).to.revertedWith("Token must be staked by owner");

    const battleTx = await bbBattle.create(
      [0, wagerAmount, startsAtBase, expiresAtBase, 999],
      [0, 100, 200, 5, 10, 300],
      [1, 2, 3, 4, 5, 6, 7]
    );

    await expect(battleTx)
      .to.emit(bbBattle, "BattleCreated")
      .withArgs(
        0,
        owner.address,
        0,
        wagerAmount,
        startsAtBase,
        expiresAtBase,
        999
      );

    await battleTx.wait();

    const {
      battleId,
      hostAddress,
      hostTokenId,
      opponentAddress,
      opponentTokenId,
      startsAt,
      expiresAt,
      completedAt,
      wager,
      outcome,
    } = await bbBattle.getBattle(0);

    expect(battleId).to.eq(0);
    expect(hostAddress).to.eq(owner.address);
    expect(hostTokenId).to.eq(0);
    expect(opponentAddress).to.eq(ethers.constants.AddressZero);
    expect(opponentTokenId).to.eq(0);
    expect(startsAt).to.eq(startsAtBase);
    expect(expiresAt).to.eq(expiresAtBase);
    expect(completedAt).to.eq(0);
    expect(wager).to.eq(wagerAmount);

    expect(outcome.seed).to.eq(0);
    expect(outcome.winnerTokenId).to.eq(0);
    expect(outcome.winnerAddress).to.eq(bbBattle.address);
    expect(outcome.loserTokenId).to.eq(0);

    const { host, hostItems, opponent, opponentItems } =
      await bbBattle.getBattleSnapshot(0);

    expect(host.tokenId).to.eq(0);
    expect(host.str).to.eq(100);
    expect(host.end).to.eq(200);
    expect(host.intel).to.eq(5);
    expect(host.lck).to.eq(10);
    expect(host.hp).to.eq(300);

    expect(hostItems.backgroundId).to.eq(1);
    expect(hostItems.weaponId).to.eq(2);
    expect(hostItems.armorId).to.eq(3);
    expect(hostItems.faceArmorId).to.eq(4);
    expect(hostItems.eyewearId).to.eq(5);
    expect(hostItems.miscId).to.eq(6);
    expect(hostItems.headId).to.eq(7);

    expect(opponent.tokenId).to.eq(0);
    expect(opponent.str).to.eq(0);
    expect(opponent.end).to.eq(0);
    expect(opponent.intel).to.eq(0);
    expect(opponent.lck).to.eq(0);
    expect(opponent.hp).to.eq(0);

    expect(opponentItems.backgroundId).to.eq(0);
    expect(opponentItems.weaponId).to.eq(0);
    expect(opponentItems.armorId).to.eq(0);
    expect(opponentItems.faceArmorId).to.eq(0);
    expect(opponentItems.eyewearId).to.eq(0);
    expect(opponentItems.miscId).to.eq(0);
    expect(opponentItems.headId).to.eq(0);
  });

  it("Join battle", async function () {
    const wagerAmount = ethers.utils.parseEther("5");

    await expect(
      bbBattle.join(3, 6, 1, [6, 100, 200, 5, 10, 300], [1, 2, 3, 4, 5, 6, 7])
    ).to.revertedWith("Battle does not exist");

    await expect(
      bbBattle.join(0, 0, 1, [0, 100, 200, 5, 10, 300], [1, 2, 3, 4, 5, 6, 7])
    ).to.revertedWith(
      "Training, questing, or battling at the moment, cannot use this token!"
    );

    await expect(
      bbBattle.join(0, 1, 1, [1, 100, 200, 5, 10, 300], [1, 2, 3, 4, 5, 6, 7])
    ).to.revertedWith(
      "Training, questing, or battling at the moment, cannot use this token!"
    );

    await expect(
      bbBattle.join(0, 5, 1, [5, 100, 200, 5, 10, 300], [1, 2, 3, 4, 5, 6, 7])
    ).to.revertedWith("Cannot battle your own bearz");

    await ethers.provider.send("evm_increaseTime", [86400 * DAYS_ADV]);
    await ethers.provider.send("evm_mine", []);

    const joinTx = await bbBattle
      .connect(alice)
      .join(0, 11, 1, [11, 100, 200, 5, 10, 300], [1, 2, 3, 4, 5, 6, 7]);

    await expect(joinTx).to.emit(bbBattle, "BattleJoined").withArgs(0, 11);

    await joinTx.wait();

    const {
      battleId,
      hostAddress,
      hostTokenId,
      opponentAddress,
      opponentTokenId,
      startsAt,
      expiresAt,
      completedAt,
      wager,
      outcome,
    } = await bbBattle.getBattle(0);

    expect(battleId).to.eq(0);
    expect(hostAddress).to.eq(owner.address);
    expect(hostTokenId).to.eq(0);
    expect(opponentAddress).to.eq(alice.address);
    expect(opponentTokenId).to.eq(11);
    expect(startsAt).to.eq(startsAtBase);
    expect(expiresAt).to.eq(expiresAtBase);
    expect(completedAt).to.eq(0);
    expect(wager).to.eq(wagerAmount);
    expect(outcome.seed).to.eq(0);
    expect(outcome.winnerTokenId).to.eq(0);
    expect(outcome.winnerAddress).to.eq(bbBattle.address);
    expect(outcome.loserTokenId).to.eq(0);

    const { host, hostItems, opponent, opponentItems } =
      await bbBattle.getBattleSnapshot(0);

    expect(host.tokenId).to.eq(0);
    expect(host.str).to.eq(100);
    expect(host.end).to.eq(200);
    expect(host.intel).to.eq(5);
    expect(host.lck).to.eq(10);
    expect(host.hp).to.eq(300);

    expect(hostItems.backgroundId).to.eq(1);
    expect(hostItems.weaponId).to.eq(2);
    expect(hostItems.armorId).to.eq(3);
    expect(hostItems.faceArmorId).to.eq(4);
    expect(hostItems.eyewearId).to.eq(5);
    expect(hostItems.miscId).to.eq(6);
    expect(hostItems.headId).to.eq(7);

    expect(opponent.tokenId).to.eq(11);
    expect(opponent.str).to.eq(100);
    expect(opponent.end).to.eq(200);
    expect(opponent.intel).to.eq(5);
    expect(opponent.lck).to.eq(10);
    expect(opponent.hp).to.eq(300);

    expect(opponentItems.backgroundId).to.eq(1);
    expect(opponentItems.weaponId).to.eq(2);
    expect(opponentItems.armorId).to.eq(3);
    expect(opponentItems.faceArmorId).to.eq(4);
    expect(opponentItems.eyewearId).to.eq(5);
    expect(opponentItems.miscId).to.eq(6);
    expect(opponentItems.headId).to.eq(7);
  });

  it("Cancel battle and receive back tokens", async function () {
    const wagerAmount = ethers.utils.parseEther("3");
    const battleTx = await bbBattle.create(
      [5, wagerAmount, startsAtBase, expiresAtBase, 999],
      [5, 100, 200, 5, 10, 300],
      [1, 2, 3, 4, 5, 6, 7]
    );
    await expect(battleTx)
      .to.emit(bbBattle, "BattleCreated")
      .withArgs(
        1,
        owner.address,
        5,
        wagerAmount,
        startsAtBase,
        expiresAtBase,
        999
      );
    await battleTx.wait();
    let balance = await erc20Token.balanceOf(owner.address);
    expect(balance.toString()).to.eq("2000000000000000000");
    const cancelTx = await bbBattle.cancel(1);
    await cancelTx.wait();
    balance = await erc20Token.balanceOf(owner.address);
    expect(balance.toString()).to.eq("5000000000000000000");

    // Empties out snapshot
    const { host, hostItems } = await bbBattle.getBattleSnapshot(1);

    expect(host.tokenId).to.eq(0);
    expect(host.str).to.eq(0);
    expect(host.end).to.eq(0);
    expect(host.intel).to.eq(0);
    expect(host.lck).to.eq(0);
    expect(host.hp).to.eq(0);

    expect(hostItems.backgroundId).to.eq(0);
    expect(hostItems.weaponId).to.eq(0);
    expect(hostItems.armorId).to.eq(0);
    expect(hostItems.faceArmorId).to.eq(0);
    expect(hostItems.eyewearId).to.eq(0);
    expect(hostItems.miscId).to.eq(0);
    expect(hostItems.headId).to.eq(0);
  });

  const getDigest = async (version, trustedSigner, tuple) => {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = {
      name: "Brawler Bearz Arena",
      version: "1.1",
      chainId: chainId,
      verifyingContract: bbBattle.address,
    };

    const types = {
      BattleEnded: [
        { name: "battleId", type: "uint256" },
        { name: "winnerAddress", type: "address" },
        { name: "winnerTokenId", type: "uint256" },
        { name: "loserTokenId", type: "uint256" },
        { name: "wager", type: "uint256" },
        { name: "seed", type: "uint256" },
      ],
    };

    console.log({
      domain,
      types,
      tuple,
    });

    const signature = await trustedSigner._signTypedData(domain, types, tuple);
    return ethers.utils.splitSignature(signature);
  };
  //
  // it("Determine winner from off-chain battle", async function () {
  //   // Do an upgrade
  //   const BrawlerBearzBattle = await hre.ethers.getContractFactory(
  //     "BrawlerBearzBattle"
  //   );
  //
  //   const upgradedBattle = await upgrades.upgradeProxy(
  //     bbBattle.address,
  //     BrawlerBearzBattle,
  //     {
  //       constructorArgs: ["0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8"],
  //       unsafeAllow: ["constructor"],
  //     }
  //   );
  //
  //   console.log("Updated", upgradedBattle.address);
  //
  //   const wagerAmount = ethers.utils.parseEther("5");
  //
  //   /*
  //   Battle memory instance,
  //       BattleOutcome memory _outcome,
  //       uint8 v,
  //       bytes32 r,
  //       bytes32 s
  //    */
  //
  //   // Valid signatures
  //   const tuple = {
  //     battleId: "0",
  //     winnerAddress: owner.address,
  //     winnerTokenId: "0",
  //     loserTokenId: "11",
  //     wager: wagerAmount?.toString(),
  //     seed: "102709181492165262396961133465538394244077376124477798533544854132708950094719",
  //   };
  //
  //   const { v, r, s } = await getDigest("1.1", owner, tuple);
  //
  //   const setBattleWinnerTx = await bbBattle.setBattleWinner(
  //     0,
  //     [
  //       owner.address,
  //       0,
  //       11,
  //       "102709181492165262396961133465538394244077376124477798533544854132708950094719",
  //     ],
  //     v,
  //     r,
  //     s
  //   );
  //
  //   await setBattleWinnerTx.wait();
  //
  //   const {
  //     battleId,
  //     hostAddress,
  //     hostTokenId,
  //     opponentAddress,
  //     opponentTokenId,
  //     startsAt,
  //     expiresAt,
  //     wager,
  //     outcome,
  //   } = await bbBattle.getBattle(0);
  //
  //   expect(battleId).to.eq(0);
  //   expect(hostAddress).to.eq(owner.address);
  //   expect(hostTokenId).to.eq(0);
  //   expect(opponentAddress).to.eq(alice.address);
  //   expect(opponentTokenId).to.eq(11);
  //   expect(startsAt).to.eq(startsAtBase);
  //   expect(expiresAt).to.eq(expiresAtBase);
  //   expect(wager).to.eq(wagerAmount);
  //   expect(outcome.seed).to.eq(
  //     "102709181492165262396961133465538394244077376124477798533544854132708950094719"
  //   );
  //   expect(outcome.winnerTokenId).to.eq(0);
  //   expect(outcome.winnerAddress).to.eq(owner.address);
  //   expect(outcome.loserTokenId).to.eq(11);
  //
  //   const tokenXP01 = await childStake.getXP(0);
  //   expect(tokenXP01).to.be.equal(300);
  //
  //   const tokenXP111 = await childStake.getXP(11);
  //   expect(tokenXP111).to.be.equal(100);
  // });
  //
  // it("Get battle changes", async function () {
  //   const battles = await bbBattle.getBattlePages(0, 20);
  //   // console.log(battles);
  // });
  //
  // it("Should NOT allow joins over max level", async function () {
  //   const wagerAmount = ethers.utils.parseEther("5");
  //
  //   const battleTx = await bbBattle.create(
  //     0,
  //     wagerAmount,
  //     startsAtBase,
  //     expiresAtBase,
  //     2
  //   );
  //
  //   await expect(battleTx)
  //     .to.emit(bbBattle, "BattleCreated")
  //     .withArgs(
  //       2,
  //       owner.address,
  //       0,
  //       wagerAmount,
  //       startsAtBase,
  //       expiresAtBase,
  //       2
  //     );
  //
  //   await battleTx.wait();
  //
  //   expect(bbBattle.connect(alice).join(0, 11, 3)).to.be.revertedWith(
  //     "Cannot join due to max level restriction."
  //   );
  // });
});
