import { expect } from "chai";
import hre, { ethers, upgrades } from "hardhat";

describe("Brawler Bearz Stake Child", function () {
  let owner;
  let alice;
  let bob;
  let childStake;
  let bbQuest;
  let erc20Token;
  const fxChild = "0xCf73231F28B7331BBe3124B907840A94851f9f11";
  const trustedForwarder = "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b"; // biconomy
  const MAX_INT =
    "115792089237316195423570985008687907853269984665640564039457584007913129639934"; // MAX INT - 1

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    // DEPLOY ERC20 TOKEN
    const CreditUtilityToken = await hre.ethers.getContractFactory(
      "CreditUtilityToken"
    );
    erc20Token = await CreditUtilityToken.deploy();
    await erc20Token.deployTransaction.wait();

    console.log("$CREDIT token deployed to:", erc20Token.address);

    const BrawlerBearzQuesting = await hre.ethers.getContractFactory(
      "BrawlerBearzQuesting"
    );

    bbQuest = await upgrades.deployProxy(BrawlerBearzQuesting, []);

    console.log("Questing token deployed to:", bbQuest.address);

    // Add simple quest
    /*
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
     */

    const addQuestTx = await bbQuest.addQuest([
      0,
      "RUINS",
      "Explore the ruins",
      "I overheard nomads uncovered some hidden items in the ruins. I am busy can you go take a look?",
      86400, // 1 day quest
      20, // Min credits + random max credits
      20, // Chance credits
      1000, // XP to receive
      1666244385,
      86400 * 3, // cooldown
      [2, 7, 18, 9999],
      [1, 1, 1, 1],
    ]);

    await addQuestTx.wait();

    const addQuestTx1 = await bbQuest.addQuest([
      0,
      "RUINS",
      "Explore the ruins",
      "I overheard nomads uncovered some hidden items in the ruins. I am busy can you go take a look?",
      86400 * 3, // 3 day quest
      25, // Min credits + random max credits
      100, // Chance credits
      3500, // XP to receive
      1666244385,
      86400 * 3, // 3 day cool down
      [30, 180, 720, 1500, 3350, 5100, 7200, 10001],
      [1, 2, 3, 4, 5, 6, 7, 8],
    ]);

    await addQuestTx1.wait();

    // DEPLOY STAKE CHILD CONTRACT
    const BrawlerBearzStakeChild = await hre.ethers.getContractFactory(
      "BrawlerBearzStakeChild"
    );

    childStake = await BrawlerBearzStakeChild.deploy(
      fxChild,
      erc20Token.address,
      trustedForwarder,
      bbQuest.address
    );

    await childStake.deployTransaction.wait();

    // Grant quest mutator role to stake contract
    const questRoleTx = await bbQuest.grantRole(
      "0x3e6ecaf2dd524bb8c65424d6f7830be4dc35cf15bcde0b0c1f0fe71da26a8a28",
      childStake.address
    );
    await questRoleTx.wait();

    // Set token mint allowance
    const allowance = await erc20Token.updateMintAllowance(
      childStake.address,
      "115792089237316195423570985008687907853269984665640564039457584007913129639935"
    );

    await allowance.wait();

    console.log("BrawlerBearzStakeChild deployed to:", childStake.address);
  });

  it("Staking logic", async function () {
    const action = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("STAKE"));

    const syncMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256[]"],
      [owner.address, [0, 3, 2]]
    );

    /*
    [
    "3945",
    "3267",
    "2941",
    "4042",
    "1232",
    "2934",
    "2542",
    "200",
    "2568",
    "4029",
    "3593",
    "542",
    "854",
    "1078",
    "2559",
    "879",
    "3602",
    "3120",
    "3128",
    "3474",
    "3684",
    "1130",
    "2712",
    "3071",
    "1872",
    "503",
    "2116",
    "2702",
    "2718",
    "44",
    "3259",
    "2560",
    "249",
    "2555",
    "3177",
    "2034",
    "2173",
    "2036",
    "3539",
    "3253",
    "3598",
    "1508",
    "3293",
    "388",
    "710",
    "3000",
    "3260",
    "2447",
    "3035",
    "2538",
    "833",
    "3775",
    "1342",
    "681",
    "440",
    "437",
    "436",
    "435",
    "433",
    "146"
]
     */
    const message = await childStake._processMessageTest(
      0,
      owner.address,
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "bytes"],
        [action, syncMessage]
      )
    );

    await message.wait();
    const stakeData = await childStake.stakes(owner.address);
    expect(stakeData.amount).to.be.equal(3);
  });

  it("Training start when staked", async function () {
    // Assumes 3 tokens staked, [0, 3, 2]
    const trainTx = await childStake.train([0, 3, 2]);
    await trainTx.wait();
    // Calculate rewards, more than yield time
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    // Ensure training value is set
    const trainingData0 = await childStake.getTrainingData(0);
    expect(trainingData0.xp).to.eq(3500); // Pending
  });

  it("Training stop and get XP", async function () {
    const stopTrainTx = await childStake.stopTraining([0, 2]);
    await stopTrainTx.wait();
    // Check XP tracker for a token
    const trainingData01 = await childStake.getTrainingData(0);
    expect(trainingData01.xp).to.eq(0);
    const xpTracker0 = await childStake.getXPData(0);
    expect(xpTracker0.xp).to.eq(3500);
    const trainingData02 = await childStake.getTrainingData(2);
    expect(trainingData02.xp).to.eq(0);
    const xpTracker2 = await childStake.getXPData(2);
    expect(xpTracker2.xp).to.eq(3500);
    // Another day passes
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    const trainingData3 = await childStake.getTrainingData(3);
    expect(trainingData3.xp).to.eq(7000); // Pending
    const stopTrainTx3 = await childStake.stopTraining([3]);
    await stopTrainTx3.wait();
    const xpTracker3 = await childStake.getXPData(3);
    expect(xpTracker3.xp).to.eq(7000);
  });

  it("Sync XP", async function () {
    // Assumes 3 tokens staked, [0, 3, 2]
    const syncTx = await childStake.withdrawXP();
    await syncTx.wait();
  });

  it("Get state data no training or questing", async function () {
    const [data0, data1, data2, data3] = await childStake.getStateBatch([
      0, 1, 2, 3,
    ]);
    expect(data0.isTraining).to.eq(false);
    expect(data0.isQuesting).to.eq(false);
    expect(data0.syncXP).to.eq(0);
    expect(data0.training.xp).to.eq(0);
    expect(data0.training.startAt).to.eq(0);
    expect(data1.isTraining).to.eq(false);
    expect(data1.isQuesting).to.eq(false);
    expect(data1.syncXP).to.eq(0);
    expect(data1.training.xp).to.eq(0);
    expect(data1.training.startAt).to.eq(0);
    expect(data1.training.endAt).to.eq(0);
  });

  it("Rewards claiming", async function () {
    const tokenIds = await childStake.getStakedTokens(owner.address);
    expect(tokenIds[0]).to.be.equal(0);
    expect(tokenIds[1]).to.be.equal(3);
    expect(tokenIds[2]).to.be.equal(2);

    // Calculate rewards, more than yield time
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const rewardsBalance = await childStake.getReward(owner.address);

    expect(ethers.utils.formatEther(rewardsBalance)).to.be.equal("45.0");

    await childStake.claim();
    expect(
      ethers.utils.formatEther(await erc20Token.balanceOf(owner.address))
    ).to.be.equal("45.0");

    // Calculate rewards, more than yield time
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const rewardsBalance2 = await childStake.getReward(owner.address);

    expect(ethers.utils.formatEther(rewardsBalance2)).to.be.equal("15.0");

    await childStake.claim();
    expect(
      ethers.utils.formatEther(await erc20Token.balanceOf(owner.address))
    ).to.be.equal("60.0");
  });

  it("Questing logic", async function () {
    const allQuests = await bbQuest.getAllQuests();
    expect(allQuests.length).to.eq(2);

    let isActiveTx = await bbQuest.setQuestActiveUntil(0, 0);
    await isActiveTx.wait();

    let activeQuests = await bbQuest.getActiveQuests();
    expect(activeQuests.length).to.eq(1);

    isActiveTx = await bbQuest.setQuestActiveUntil(0, 1792474785);
    await isActiveTx.wait();

    activeQuests = await bbQuest.getActiveQuests();
    expect(activeQuests.length).to.eq(2);

    const questPrice = await childStake.questPrice();

    expect(questPrice).to.eq("100000000000000000000");

    // Set new price
    const questPriceChangeTx = await childStake.setQuestPrice(
      "10000000000000000000"
    );

    await questPriceChangeTx.wait();
    const approvalTx = await erc20Token.approve(childStake.address, MAX_INT);
    await approvalTx.wait();

    const questPrice1 = await childStake.questPrice();

    expect(questPrice1).to.eq("10000000000000000000");

    const questTx = await childStake.quest(
      [0, 3, 2],
      [
        activeQuests[0]?.questId?.toNumber(),
        activeQuests[0]?.questId?.toNumber(),
        activeQuests[1]?.questId?.toNumber(),
      ],
      questPrice1.mul(3)
    );

    await questTx.wait();

    const [data0, data3, data2] = await childStake.getStateBatch([0, 3, 2]);

    expect(data0.isQuesting).to.eq(true);
    expect(data3.isQuesting).to.eq(true);
    expect(data2.isQuesting).to.eq(true);

    expect(
      ethers.utils.formatEther(await erc20Token.balanceOf(owner.address))
    ).to.be.equal("30.0");
  });

  it("End quest logic", async function () {
    expect(await childStake.isQuesting(0)).to.eq(true);
    expect(await childStake.isQuesting(3)).to.eq(true);
    expect(await childStake.isQuesting(2)).to.eq(true);

    await ethers.provider.send("evm_increaseTime", [86400]); // ahead 1 days
    await ethers.provider.send("evm_mine", []);

    const endQuestTx = await childStake.endQuest([0, 3]);
    await endQuestTx.wait();

    // Try to quest before cooldown is over
    const activeQuests = await bbQuest.getActiveQuests();
    const questPrice1 = await childStake.questPrice();

    await expect(
      childStake.quest(
        [0, 3],
        [
          activeQuests[0]?.questId?.toNumber(),
          activeQuests[0]?.questId?.toNumber(),
        ],
        questPrice1.mul(2)
      )
    ).to.revertedWith("cooldown");

    expect(await childStake.isQuesting(0)).to.eq(false);
    expect(await childStake.isQuesting(3)).to.eq(false);
    expect(await childStake.isQuesting(2)).to.eq(true);

    await ethers.provider.send("evm_increaseTime", [86400 * 3]); // ahead 2 days
    await ethers.provider.send("evm_mine", []);

    const endQuestTx1 = await childStake.endQuest([2]);
    await endQuestTx1.wait();
    expect(await childStake.isQuesting(2)).to.eq(false);

    const rewards0 = await bbQuest.getClaimableRewards(owner.address);

    expect(rewards0.filter((item) => item.typeOf === "SHOP").length).to.eq(3);
    expect(rewards0.filter((item) => item.typeOf === "CREDIT").length).to.eq(3);
    expect(rewards0.filter((item) => item.typeOf === "XP").length).to.eq(3);
  });

  it("Verify claimable items", async function () {
    const rewardItems = await bbQuest.getClaimableItems(owner.address);
    console.log(JSON.stringify(rewardItems, null, 2));
  });

  it("Withdraw reward items", async function () {
    const withdrawRewardsTx = await childStake.withdrawQuestRewards();
    await withdrawRewardsTx.wait();
  });

  it("Unstaking logic", async function () {
    const action = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("UNSTAKE"));

    // const toUnstake = [
    //   0, 79, 80, 293, 294, 0, 79, 295, 296, 295, 295, 297, 298, 299, 300, 301,
    //   302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 315, 316, 317,
    //   318, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 331, 332, 333, 334,
    //   335, 336, 337, 338, 339, 340, 341, 342, 344, 345, 346, 347, 349, 350, 352,
    //   353, 355, 356, 360, 361, 362, 363, 366, 368, 369, 371, 3082, 3171, 3541,
    //   3683, 48, 134, 135, 653, 999, 1502, 1503, 1504, 1505, 1831, 1893, 1894,
    //   2016, 2018, 2044, 2076, 2355, 2937, 2938, 2939, 3057, 3115, 3248, 3482,
    //   3508, 3582, 3594, 3608, 3913, 4043, 207, 1775, 2549, 2550, 2627, 2636,
    //   3043, 3193, 3264, 3308, 3360, 3366, 3595, 3648,
    // ];

    // [146,433,435,436,437,439,440,681,1342,833,2538,3775,3035,436,439,3035,3775,436,2447,439,3035,3775,439,710,3000,3260,388,3293,1508,3598,3253,3539,2034,2036,2173,3177,2555,249,2560,3259,44,3985,2718,3985,2702,2116,503,1872,2712,3071,1130,3684,3474,3120,3128,3602,879,542,854,1078,2559,3593,2568,4029,200,2542,2934,1232,4042,2941,3267,3945]

    const syncMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256[]"],
      [owner.address, [0, 2]]
    );

    const message2 = await childStake._processMessageTest(
      0,
      owner.address,
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "bytes"],
        [action, syncMessage]
      )
    );
    await message2.wait();
    const stakeData2 = await childStake.stakes(owner.address);

    expect(stakeData2.amount).to.be.equal(1);

    const tokenIds = await childStake.getStakedTokens(owner.address);
    expect(tokenIds[0]).to.be.equal(3);

    // Calculate rewards, more than yield time
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const rewardsBalance = await childStake.getReward(owner.address);

    expect(ethers.utils.formatEther(rewardsBalance)).to.be.equal("5.0");
    await childStake.claim();
  });
});
