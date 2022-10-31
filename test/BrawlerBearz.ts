import { expect } from "chai";
import hre, { ethers, upgrades } from "hardhat";
import { networkConfig } from "../helper-hardhat-config";
import fs from "fs";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const wlAddresses = [
  "0x593b94c059f37f1AF542c25A0F4B22Cd2695Fb68",
  "0x645990467105162Ca1a74b45b800b3BEcfD405e9",
];

const proof = (tree, addr) => tree.getHexProof(keccak256(addr));

describe("Brawler Bearz", function () {
  let owner;
  let alice;
  let bob;
  let bb;
  let bbPass;
  let bbRenderer;
  let bbShop;
  let bbStake;
  let bbFactions;
  let genesLibrary;
  let maxTokens;
  let price;
  let vrfCoordinator;
  let keyHash;
  let subscriptionId;
  let mockVrfCoordinator;
  let leafNodes;
  let merkleTree;
  let wlMerkleRoot;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const networkName = hre.network.name;
    const chainId = hre.network.config.chainId;
    const checkpointManager = "0x2890bA17EfE978480615e330ecB65333b880928e";
    const fxRoot = "0x3d1d3E34f7fB6D26245E6640E1c50710eFFf15bA";

    leafNodes = [...wlAddresses, owner.address, bob.address]
      .map((a) => a.toLowerCase())
      .map((a) => keccak256(a));

    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

    wlMerkleRoot = merkleTree.getHexRoot();

    if (networkName === "rinkeby") {
      vrfCoordinator = "0x6168499c0cFfCaCD319c818142124B7A15E857ab";
      keyHash =
        "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";
      subscriptionId = 5298;
    } else {
      // local hardhat
      const vrfCoordFactory = await ethers.getContractFactory(
        "VRFCoordinatorV2Mock"
      );

      mockVrfCoordinator = await vrfCoordFactory
        .connect(owner)
        .deploy(100000, 100000);

      const fundAmount = networkConfig[chainId].fundAmount;
      const transaction = await mockVrfCoordinator.createSubscription();
      const transactionReceipt = await transaction.wait();

      subscriptionId = ethers.BigNumber.from(
        transactionReceipt.events[0].topics[1]
      );

      await mockVrfCoordinator.fundSubscription(subscriptionId, fundAmount);

      vrfCoordinator = mockVrfCoordinator.address;

      keyHash =
        "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";

      console.log("mock vrf coordinator", mockVrfCoordinator.address);
    }

    // Deploy access pass
    const BrawlerBearzAccessPass = await ethers.getContractFactory(
      "BrawlerBearzAccessPass"
    );

    bbPass = await BrawlerBearzAccessPass.deploy();

    // Deploy faction
    const BrawlerBearzFactions = await ethers.getContractFactory(
      "BrawlerBearzFactions"
    );

    bbFactions = await BrawlerBearzFactions.deploy(bbPass.address);

    // Airdrop passes
    const mintPassTx = await bbPass.airdrop([
      owner.address,
      alice?.address || owner.address,
      bob?.address || owner.address,
    ]);

    await mintPassTx.wait();
    const mintPassTx1 = await bbPass.airdrop([owner.address]);
    await mintPassTx1.wait();

    // Deploy genes library
    const Genes = await ethers.getContractFactory("Genes");

    genesLibrary = await Genes.deploy();

    await genesLibrary.deployed();

    // Deploy attributes rendering contract
    const BrawlerBearzRenderer = await ethers.getContractFactory(
      "BrawlerBearzRenderer",
      {
        libraries: {
          Genes: genesLibrary.address,
        },
      }
    );

    bbRenderer = await BrawlerBearzRenderer.deploy(
      "ipfs://cid/",
      "ipfs://animationcid/"
    );

    await bbRenderer.deployed();

    console.log("Renderer address", bbRenderer.address);

    // Deploy items contract
    const BrawlerBearzShop = await ethers.getContractFactory(
      "BrawlerBearzShop"
    );

    bbShop = await upgrades.deployProxy(BrawlerBearzShop, []);

    console.log("Shop address", bbShop.address);

    // Mint some items (background, armor, weapon, misc...)
    const backgroundItemMintTx = await bbShop.mint(owner.address, 1, 2, "0x00");
    await backgroundItemMintTx.wait();
    await bbShop.setItemMetadata(1, "BACKGROUND", "Special background", 0);

    const weaponItemMintTx = await bbShop.mint(owner.address, 2, 2, "0x00");
    await weaponItemMintTx.wait();
    await bbShop.setItemMetadata(2, "WEAPON", "Special weapon", 0);

    const armorItemMintTx = await bbShop.mint(owner.address, 3, 2, "0x00");
    await armorItemMintTx.wait();
    await bbShop.setItemMetadata(3, "ARMOR", "Special armor", 0);

    const faceArmorItemMintTx = await bbShop.mint(owner.address, 4, 2, "0x00");
    await faceArmorItemMintTx.wait();
    await bbShop.setItemMetadata(4, "FACE_ARMOR", "Special face armor", 0);

    const eyewearItemMintTx = await bbShop.mint(owner.address, 5, 2, "0x00");
    await eyewearItemMintTx.wait();
    await bbShop.setItemMetadata(5, "EYEWEAR", "Special eyewear", 0);

    const miscItemMintTx = await bbShop.mint(owner.address, 6, 2, "0x00");
    await miscItemMintTx.wait();
    await bbShop.setItemMetadata(6, "MISC", "Special misc", 0);

    const airdropMintTx = await bbShop.mint(alice.address, 7, 1, "0x00");
    await airdropMintTx.wait();

    await bbShop.setItemMetadata(
      7,
      "BACKGROUND",
      "Special background from drop",
      0
    );

    const weaponItemMintTx1 = await bbShop.mint(owner.address, 8, 2, "0x00");
    await weaponItemMintTx1.wait();
    await bbShop.setItemMetadata(
      8,
      "WEAPON",
      "Special weapon w/ level requirement",
      2
    );

    const headItemMintTx = await bbShop.mint(owner.address, 9, 1, "0x00");
    await headItemMintTx.wait();
    await bbShop.setItemMetadataStruct(9, [
      "HEAD",
      "Purple Pirate Hat",
      0,
      "UNCOMMON",
      0,
      0,
      0,
      "PERSISTENT",
      "The purple pirate hat description goes up in here.",
    ]);

    const shopDropItemsTx = await bbShop.setShopDropItemIds([
      7, 7, 7, 7, 7, 7, 7, 7,
    ]);
    await shopDropItemsTx.wait();

    const shopDropRaritiesTx = await bbShop.setShopDropRarities([
      100, 300, 500, 1000, 2000, 3000, 7000, 10001,
    ]);
    await shopDropRaritiesTx.wait();

    console.log("Minted shop items to owner address");

    const setVendorOnRendererTx = await bbRenderer.setVendorContractAddress(
      bbShop.address
    );
    await setVendorOnRendererTx.wait();

    console.log("Set vendor readability on renderer contract for shop items");

    const BrawlerBearz = await ethers.getContractFactory("BrawlerBearz");

    bb = await BrawlerBearz.deploy(
      vrfCoordinator,
      keyHash,
      subscriptionId,
      bbPass.address,
      bbFactions.address,
      bbRenderer.address,
      bbShop.address
    );

    await bb.deployed();

    console.log("address", bb.address);

    const BrawlerBearzStake = await hre.ethers.getContractFactory(
      "BrawlerBearzStake"
    );

    bbStake = await BrawlerBearzStake.deploy(
      checkpointManager,
      fxRoot,
      bb.address,
      bbShop.address
    );

    await bbStake.deployTransaction.wait();

    console.log("stake address", bbStake.address);

    // Grant approvals for the staking contract to lock tokens
    const updateLockApprovalsTx = await bb.updateApprovedContracts(
      [bbStake.address],
      [true]
    );
    await updateLockApprovalsTx.wait();

    console.log("Updated approvals to allow stake to lock tokens");

    // Grant external contract role to bearz nft contract
    const extRoleTx = await bbShop.grantRole(
      "0xfc774c32e29e21e9ba21cd756bf11bad138fd7eb34eb4d84154c03fe1e0ce860",
      bb.address
    );

    await extRoleTx.wait();

    // Grant XP mutator role to stake contract
    const extRoleTx1 = await bb.grantRole(
      "0xf11b02a75234472a5060a94045900fd33989cb6e8ec8dd50e38ed9a49356cba4",
      bbStake.address
    );

    await extRoleTx1.wait();

    console.log(
      "Granted external contract role to bearz contract and xp role to stake contract"
    );

    // Grant external contract role to bearz stake contract
    const extRoleTx2 = await bbShop.grantRole(
      "0xfc774c32e29e21e9ba21cd756bf11bad138fd7eb34eb4d84154c03fe1e0ce860",
      bbStake.address
    );

    await extRoleTx2.wait();

    price = 0.045;
    maxTokens = 10;

    const maxPerWalletTx = await bb.setMaxPerWallet(9999);
    await maxPerWalletTx.wait();

    const maxSupplyTx = await bb.setMaxSupply(9999);
    await maxSupplyTx.wait();

    // Add sub consumer
    if (networkName === "rinkeby") {
      const vrfContract = new ethers.Contract(
        "0x6168499c0cffcacd319c818142124b7a15e857ab",
        [
          {
            inputs: [
              { internalType: "address", name: "link", type: "address" },
              {
                internalType: "address",
                name: "blockhashStore",
                type: "address",
              },
              { internalType: "address", name: "linkEthFeed", type: "address" },
            ],
            stateMutability: "nonpayable",
            type: "constructor",
          },
          {
            inputs: [
              {
                internalType: "uint256",
                name: "internalBalance",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "externalBalance",
                type: "uint256",
              },
            ],
            name: "BalanceInvariantViolated",
            type: "error",
          },
          {
            inputs: [
              { internalType: "uint256", name: "blockNum", type: "uint256" },
            ],
            name: "BlockhashNotInStore",
            type: "error",
          },
          {
            inputs: [
              { internalType: "uint32", name: "have", type: "uint32" },
              { internalType: "uint32", name: "want", type: "uint32" },
            ],
            name: "GasLimitTooBig",
            type: "error",
          },
          { inputs: [], name: "IncorrectCommitment", type: "error" },
          { inputs: [], name: "InsufficientBalance", type: "error" },
          {
            inputs: [
              { internalType: "uint256", name: "have", type: "uint256" },
              { internalType: "uint256", name: "want", type: "uint256" },
            ],
            name: "InsufficientGasForConsumer",
            type: "error",
          },
          { inputs: [], name: "InvalidCalldata", type: "error" },
          {
            inputs: [
              { internalType: "uint64", name: "subId", type: "uint64" },
              { internalType: "address", name: "consumer", type: "address" },
            ],
            name: "InvalidConsumer",
            type: "error",
          },
          {
            inputs: [
              { internalType: "int256", name: "linkWei", type: "int256" },
            ],
            name: "InvalidLinkWeiPrice",
            type: "error",
          },
          {
            inputs: [
              { internalType: "uint16", name: "have", type: "uint16" },
              { internalType: "uint16", name: "min", type: "uint16" },
              { internalType: "uint16", name: "max", type: "uint16" },
            ],
            name: "InvalidRequestConfirmations",
            type: "error",
          },
          { inputs: [], name: "InvalidSubscription", type: "error" },
          {
            inputs: [
              {
                internalType: "address",
                name: "proposedOwner",
                type: "address",
              },
            ],
            name: "MustBeRequestedOwner",
            type: "error",
          },
          {
            inputs: [
              { internalType: "address", name: "owner", type: "address" },
            ],
            name: "MustBeSubOwner",
            type: "error",
          },
          { inputs: [], name: "NoCorrespondingRequest", type: "error" },
          {
            inputs: [
              { internalType: "bytes32", name: "keyHash", type: "bytes32" },
            ],
            name: "NoSuchProvingKey",
            type: "error",
          },
          {
            inputs: [
              { internalType: "uint32", name: "have", type: "uint32" },
              { internalType: "uint32", name: "want", type: "uint32" },
            ],
            name: "NumWordsTooBig",
            type: "error",
          },
          { inputs: [], name: "OnlyCallableFromLink", type: "error" },
          { inputs: [], name: "PaymentTooLarge", type: "error" },
          { inputs: [], name: "PendingRequestExists", type: "error" },
          {
            inputs: [
              { internalType: "bytes32", name: "keyHash", type: "bytes32" },
            ],
            name: "ProvingKeyAlreadyRegistered",
            type: "error",
          },
          { inputs: [], name: "Reentrant", type: "error" },
          { inputs: [], name: "TooManyConsumers", type: "error" },
          {
            anonymous: false,
            inputs: [
              {
                indexed: false,
                internalType: "uint16",
                name: "minimumRequestConfirmations",
                type: "uint16",
              },
              {
                indexed: false,
                internalType: "uint32",
                name: "maxGasLimit",
                type: "uint32",
              },
              {
                indexed: false,
                internalType: "uint32",
                name: "stalenessSeconds",
                type: "uint32",
              },
              {
                indexed: false,
                internalType: "uint32",
                name: "gasAfterPaymentCalculation",
                type: "uint32",
              },
              {
                indexed: false,
                internalType: "int256",
                name: "fallbackWeiPerUnitLink",
                type: "int256",
              },
              {
                components: [
                  {
                    internalType: "uint32",
                    name: "fulfillmentFlatFeeLinkPPMTier1",
                    type: "uint32",
                  },
                  {
                    internalType: "uint32",
                    name: "fulfillmentFlatFeeLinkPPMTier2",
                    type: "uint32",
                  },
                  {
                    internalType: "uint32",
                    name: "fulfillmentFlatFeeLinkPPMTier3",
                    type: "uint32",
                  },
                  {
                    internalType: "uint32",
                    name: "fulfillmentFlatFeeLinkPPMTier4",
                    type: "uint32",
                  },
                  {
                    internalType: "uint32",
                    name: "fulfillmentFlatFeeLinkPPMTier5",
                    type: "uint32",
                  },
                  {
                    internalType: "uint24",
                    name: "reqsForTier2",
                    type: "uint24",
                  },
                  {
                    internalType: "uint24",
                    name: "reqsForTier3",
                    type: "uint24",
                  },
                  {
                    internalType: "uint24",
                    name: "reqsForTier4",
                    type: "uint24",
                  },
                  {
                    internalType: "uint24",
                    name: "reqsForTier5",
                    type: "uint24",
                  },
                ],
                indexed: false,
                internalType: "struct VRFCoordinatorV2.FeeConfig",
                name: "feeConfig",
                type: "tuple",
              },
            ],
            name: "ConfigSet",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: false,
                internalType: "address",
                name: "to",
                type: "address",
              },
              {
                indexed: false,
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
            ],
            name: "FundsRecovered",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
              },
              {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
              },
            ],
            name: "OwnershipTransferRequested",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
              },
              {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
              },
            ],
            name: "OwnershipTransferred",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: false,
                internalType: "bytes32",
                name: "keyHash",
                type: "bytes32",
              },
              {
                indexed: true,
                internalType: "address",
                name: "oracle",
                type: "address",
              },
            ],
            name: "ProvingKeyDeregistered",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: false,
                internalType: "bytes32",
                name: "keyHash",
                type: "bytes32",
              },
              {
                indexed: true,
                internalType: "address",
                name: "oracle",
                type: "address",
              },
            ],
            name: "ProvingKeyRegistered",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "uint256",
                name: "requestId",
                type: "uint256",
              },
              {
                indexed: false,
                internalType: "uint256",
                name: "outputSeed",
                type: "uint256",
              },
              {
                indexed: false,
                internalType: "uint96",
                name: "payment",
                type: "uint96",
              },
              {
                indexed: false,
                internalType: "bool",
                name: "success",
                type: "bool",
              },
            ],
            name: "RandomWordsFulfilled",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "bytes32",
                name: "keyHash",
                type: "bytes32",
              },
              {
                indexed: false,
                internalType: "uint256",
                name: "requestId",
                type: "uint256",
              },
              {
                indexed: false,
                internalType: "uint256",
                name: "preSeed",
                type: "uint256",
              },
              {
                indexed: true,
                internalType: "uint64",
                name: "subId",
                type: "uint64",
              },
              {
                indexed: false,
                internalType: "uint16",
                name: "minimumRequestConfirmations",
                type: "uint16",
              },
              {
                indexed: false,
                internalType: "uint32",
                name: "callbackGasLimit",
                type: "uint32",
              },
              {
                indexed: false,
                internalType: "uint32",
                name: "numWords",
                type: "uint32",
              },
              {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
              },
            ],
            name: "RandomWordsRequested",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "uint64",
                name: "subId",
                type: "uint64",
              },
              {
                indexed: false,
                internalType: "address",
                name: "to",
                type: "address",
              },
              {
                indexed: false,
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
            ],
            name: "SubscriptionCanceled",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "uint64",
                name: "subId",
                type: "uint64",
              },
              {
                indexed: false,
                internalType: "address",
                name: "consumer",
                type: "address",
              },
            ],
            name: "SubscriptionConsumerAdded",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "uint64",
                name: "subId",
                type: "uint64",
              },
              {
                indexed: false,
                internalType: "address",
                name: "consumer",
                type: "address",
              },
            ],
            name: "SubscriptionConsumerRemoved",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "uint64",
                name: "subId",
                type: "uint64",
              },
              {
                indexed: false,
                internalType: "address",
                name: "owner",
                type: "address",
              },
            ],
            name: "SubscriptionCreated",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "uint64",
                name: "subId",
                type: "uint64",
              },
              {
                indexed: false,
                internalType: "uint256",
                name: "oldBalance",
                type: "uint256",
              },
              {
                indexed: false,
                internalType: "uint256",
                name: "newBalance",
                type: "uint256",
              },
            ],
            name: "SubscriptionFunded",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "uint64",
                name: "subId",
                type: "uint64",
              },
              {
                indexed: false,
                internalType: "address",
                name: "from",
                type: "address",
              },
              {
                indexed: false,
                internalType: "address",
                name: "to",
                type: "address",
              },
            ],
            name: "SubscriptionOwnerTransferRequested",
            type: "event",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "uint64",
                name: "subId",
                type: "uint64",
              },
              {
                indexed: false,
                internalType: "address",
                name: "from",
                type: "address",
              },
              {
                indexed: false,
                internalType: "address",
                name: "to",
                type: "address",
              },
            ],
            name: "SubscriptionOwnerTransferred",
            type: "event",
          },
          {
            inputs: [],
            name: "BLOCKHASH_STORE",
            outputs: [
              {
                internalType: "contract BlockhashStoreInterface",
                name: "",
                type: "address",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "LINK",
            outputs: [
              {
                internalType: "contract LinkTokenInterface",
                name: "",
                type: "address",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "LINK_ETH_FEED",
            outputs: [
              {
                internalType: "contract AggregatorV3Interface",
                name: "",
                type: "address",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "MAX_CONSUMERS",
            outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "MAX_NUM_WORDS",
            outputs: [{ internalType: "uint32", name: "", type: "uint32" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "MAX_REQUEST_CONFIRMATIONS",
            outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "acceptOwnership",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [{ internalType: "uint64", name: "subId", type: "uint64" }],
            name: "acceptSubscriptionOwnerTransfer",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              { internalType: "uint64", name: "subId", type: "uint64" },
              { internalType: "address", name: "consumer", type: "address" },
            ],
            name: "addConsumer",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              { internalType: "uint64", name: "subId", type: "uint64" },
              { internalType: "address", name: "to", type: "address" },
            ],
            name: "cancelSubscription",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [],
            name: "createSubscription",
            outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              {
                internalType: "uint256[2]",
                name: "publicProvingKey",
                type: "uint256[2]",
              },
            ],
            name: "deregisterProvingKey",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              {
                components: [
                  {
                    internalType: "uint256[2]",
                    name: "pk",
                    type: "uint256[2]",
                  },
                  {
                    internalType: "uint256[2]",
                    name: "gamma",
                    type: "uint256[2]",
                  },
                  { internalType: "uint256", name: "c", type: "uint256" },
                  { internalType: "uint256", name: "s", type: "uint256" },
                  { internalType: "uint256", name: "seed", type: "uint256" },
                  {
                    internalType: "address",
                    name: "uWitness",
                    type: "address",
                  },
                  {
                    internalType: "uint256[2]",
                    name: "cGammaWitness",
                    type: "uint256[2]",
                  },
                  {
                    internalType: "uint256[2]",
                    name: "sHashWitness",
                    type: "uint256[2]",
                  },
                  { internalType: "uint256", name: "zInv", type: "uint256" },
                ],
                internalType: "struct VRF.Proof",
                name: "proof",
                type: "tuple",
              },
              {
                components: [
                  { internalType: "uint64", name: "blockNum", type: "uint64" },
                  { internalType: "uint64", name: "subId", type: "uint64" },
                  {
                    internalType: "uint32",
                    name: "callbackGasLimit",
                    type: "uint32",
                  },
                  { internalType: "uint32", name: "numWords", type: "uint32" },
                  { internalType: "address", name: "sender", type: "address" },
                ],
                internalType: "struct VRFCoordinatorV2.RequestCommitment",
                name: "rc",
                type: "tuple",
              },
            ],
            name: "fulfillRandomWords",
            outputs: [{ internalType: "uint96", name: "", type: "uint96" }],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              { internalType: "uint256", name: "requestId", type: "uint256" },
            ],
            name: "getCommitment",
            outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "getConfig",
            outputs: [
              {
                internalType: "uint16",
                name: "minimumRequestConfirmations",
                type: "uint16",
              },
              { internalType: "uint32", name: "maxGasLimit", type: "uint32" },
              {
                internalType: "uint32",
                name: "stalenessSeconds",
                type: "uint32",
              },
              {
                internalType: "uint32",
                name: "gasAfterPaymentCalculation",
                type: "uint32",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "getCurrentSubId",
            outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "getFallbackWeiPerUnitLink",
            outputs: [{ internalType: "int256", name: "", type: "int256" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "getFeeConfig",
            outputs: [
              {
                internalType: "uint32",
                name: "fulfillmentFlatFeeLinkPPMTier1",
                type: "uint32",
              },
              {
                internalType: "uint32",
                name: "fulfillmentFlatFeeLinkPPMTier2",
                type: "uint32",
              },
              {
                internalType: "uint32",
                name: "fulfillmentFlatFeeLinkPPMTier3",
                type: "uint32",
              },
              {
                internalType: "uint32",
                name: "fulfillmentFlatFeeLinkPPMTier4",
                type: "uint32",
              },
              {
                internalType: "uint32",
                name: "fulfillmentFlatFeeLinkPPMTier5",
                type: "uint32",
              },
              { internalType: "uint24", name: "reqsForTier2", type: "uint24" },
              { internalType: "uint24", name: "reqsForTier3", type: "uint24" },
              { internalType: "uint24", name: "reqsForTier4", type: "uint24" },
              { internalType: "uint24", name: "reqsForTier5", type: "uint24" },
            ],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [
              { internalType: "uint64", name: "reqCount", type: "uint64" },
            ],
            name: "getFeeTier",
            outputs: [{ internalType: "uint32", name: "", type: "uint32" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "getRequestConfig",
            outputs: [
              { internalType: "uint16", name: "", type: "uint16" },
              { internalType: "uint32", name: "", type: "uint32" },
              { internalType: "bytes32[]", name: "", type: "bytes32[]" },
            ],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [{ internalType: "uint64", name: "subId", type: "uint64" }],
            name: "getSubscription",
            outputs: [
              { internalType: "uint96", name: "balance", type: "uint96" },
              { internalType: "uint64", name: "reqCount", type: "uint64" },
              { internalType: "address", name: "owner", type: "address" },
              {
                internalType: "address[]",
                name: "consumers",
                type: "address[]",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "getTotalBalance",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [
              {
                internalType: "uint256[2]",
                name: "publicKey",
                type: "uint256[2]",
              },
            ],
            name: "hashOfKey",
            outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
            stateMutability: "pure",
            type: "function",
          },
          {
            inputs: [
              { internalType: "address", name: "", type: "address" },
              { internalType: "uint256", name: "amount", type: "uint256" },
              { internalType: "bytes", name: "data", type: "bytes" },
            ],
            name: "onTokenTransfer",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              { internalType: "address", name: "recipient", type: "address" },
              { internalType: "uint96", name: "amount", type: "uint96" },
            ],
            name: "oracleWithdraw",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [],
            name: "owner",
            outputs: [{ internalType: "address", name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [{ internalType: "uint64", name: "subId", type: "uint64" }],
            name: "ownerCancelSubscription",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [{ internalType: "uint64", name: "subId", type: "uint64" }],
            name: "pendingRequestExists",
            outputs: [{ internalType: "bool", name: "", type: "bool" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [{ internalType: "address", name: "to", type: "address" }],
            name: "recoverFunds",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              { internalType: "address", name: "oracle", type: "address" },
              {
                internalType: "uint256[2]",
                name: "publicProvingKey",
                type: "uint256[2]",
              },
            ],
            name: "registerProvingKey",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              { internalType: "uint64", name: "subId", type: "uint64" },
              { internalType: "address", name: "consumer", type: "address" },
            ],
            name: "removeConsumer",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              { internalType: "bytes32", name: "keyHash", type: "bytes32" },
              { internalType: "uint64", name: "subId", type: "uint64" },
              {
                internalType: "uint16",
                name: "requestConfirmations",
                type: "uint16",
              },
              {
                internalType: "uint32",
                name: "callbackGasLimit",
                type: "uint32",
              },
              { internalType: "uint32", name: "numWords", type: "uint32" },
            ],
            name: "requestRandomWords",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              { internalType: "uint64", name: "subId", type: "uint64" },
              { internalType: "address", name: "newOwner", type: "address" },
            ],
            name: "requestSubscriptionOwnerTransfer",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              {
                internalType: "uint16",
                name: "minimumRequestConfirmations",
                type: "uint16",
              },
              { internalType: "uint32", name: "maxGasLimit", type: "uint32" },
              {
                internalType: "uint32",
                name: "stalenessSeconds",
                type: "uint32",
              },
              {
                internalType: "uint32",
                name: "gasAfterPaymentCalculation",
                type: "uint32",
              },
              {
                internalType: "int256",
                name: "fallbackWeiPerUnitLink",
                type: "int256",
              },
              {
                components: [
                  {
                    internalType: "uint32",
                    name: "fulfillmentFlatFeeLinkPPMTier1",
                    type: "uint32",
                  },
                  {
                    internalType: "uint32",
                    name: "fulfillmentFlatFeeLinkPPMTier2",
                    type: "uint32",
                  },
                  {
                    internalType: "uint32",
                    name: "fulfillmentFlatFeeLinkPPMTier3",
                    type: "uint32",
                  },
                  {
                    internalType: "uint32",
                    name: "fulfillmentFlatFeeLinkPPMTier4",
                    type: "uint32",
                  },
                  {
                    internalType: "uint32",
                    name: "fulfillmentFlatFeeLinkPPMTier5",
                    type: "uint32",
                  },
                  {
                    internalType: "uint24",
                    name: "reqsForTier2",
                    type: "uint24",
                  },
                  {
                    internalType: "uint24",
                    name: "reqsForTier3",
                    type: "uint24",
                  },
                  {
                    internalType: "uint24",
                    name: "reqsForTier4",
                    type: "uint24",
                  },
                  {
                    internalType: "uint24",
                    name: "reqsForTier5",
                    type: "uint24",
                  },
                ],
                internalType: "struct VRFCoordinatorV2.FeeConfig",
                name: "feeConfig",
                type: "tuple",
              },
            ],
            name: "setConfig",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [{ internalType: "address", name: "to", type: "address" }],
            name: "transferOwnership",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [],
            name: "typeAndVersion",
            outputs: [{ internalType: "string", name: "", type: "string" }],
            stateMutability: "pure",
            type: "function",
          },
        ],
        owner
      );
      const addConsumerTx = await vrfContract.addConsumer(
        subscriptionId,
        bb.address,
        {
          gasLimit: 150000,
          maxFeePerGas: ethers.utils.parseUnits("2", "gwei"),
          maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
        }
      );
      await addConsumerTx.wait();
    } else if (mockVrfCoordinator) {
      await expect(
        mockVrfCoordinator
          .connect(owner)
          .addConsumer(subscriptionId, bb.address)
      );
    }

    console.log("\n Added subscription consumer", subscriptionId);

    // Set approvals for the access pass
    const approvalTx = await bbPass.setApprovalForAll(bb.address, true);
    await approvalTx.wait();

    const liveAtTx = await bb.setLiveAt(0);
    await liveAtTx.wait();

    const whitelistLiveAtTx = await bb.setWhitelistLiveAt(0);
    await whitelistLiveAtTx.wait();

    console.log(
      `npx hardhat verify --network rinkeby ${bb.address} ${vrfCoordinator} ${keyHash} ${subscriptionId}`
    );
  });

  it("Should be able to set whitelist merkle root", async function () {
    const merkleRootTx = await bb.setMerkleRoot(wlMerkleRoot);
    await merkleRootTx.wait();
    expect(await bb.merkleRoot()).to.equal(wlMerkleRoot);
  });

  it("Should NOT allow whitelist mint for missing address", async function () {
    await expect(
      bb.connect(alice).whitelistMint(1, proof(merkleTree, alice.address), {
        value: ethers.utils.parseEther(String(price)),
        gasLimit: 150000,
      })
    ).to.revertedWith("4");
  });

  it("Should be able to whitelist mint and get airdropped vendor item", async function () {
    const mintTx = await bb.whitelistMint(3, proof(merkleTree, owner.address), {
      value: ethers.utils.parseEther(String(3 * price)),
      gasLimit: 320000,
    });
    await mintTx.wait();
    // Show possible whitelist mints possible
    expect(await bb.getAddressMintsRemaining(owner.address)).to.eq(
      9999 - 3 - 1
    );
    // Insta reveal
    const revealTx = await bb.reveal();
    if (mockVrfCoordinator) {
      const { events } = await revealTx.wait();
      const [reqId] = events.filter((x) => x.event === "RandomnessRequest")[0]
        ?.args;
      if (reqId) {
        await expect(
          mockVrfCoordinator.fulfillRandomWords(reqId, bb.address)
        ).to.emit(mockVrfCoordinator, "RandomWordsFulfilled");
      }
    } else {
      await revealTx.wait();
    }

    expect(await bb.ownerOf(1)).to.equal(owner.address);
    expect(await bbShop.balanceOf(owner.address, 7)).to.equal(3);
  });

  it("Should NOT be able to mint more than max tokens per transaction", async function () {
    expect(
      bb.mint(maxTokens + 1, {
        value: ethers.utils.parseEther((maxTokens + 1 * price).toFixed(6)),
      })
    ).to.be.revertedWith("Exceeds max per tx.");
  });

  it("Should NOT be able to mint with invalid funds", async function () {
    expect(
      bb.mint(3, {
        value: ethers.utils.parseEther((3 * (price * 0.9)).toFixed(6)),
      })
    ).to.be.revertedWith("Invalid funds provided.");
  });

  it("Should be able to public mint 1 token", async function () {
    const currentSupply = await bb.totalSupply();
    const mintTx = await bb.mint(1, {
      value: ethers.utils.parseEther(String(price)),
      gasLimit: 160000,
    });
    await mintTx.wait();
    const newSupply = await bb.totalSupply();
    expect(newSupply.toNumber()).to.equal(currentSupply.toNumber() + 1);
  });

  it("Should be able to public mint 10 tokens", async function () {
    const iterations = 1;
    const currentSupply = await bb.totalSupply();
    for (let i = 0; i < iterations; i++) {
      const mintTx = await bb.mint(maxTokens, {
        value: ethers.utils.parseEther((maxTokens * price).toFixed(6)),
        gasLimit: 350000,
      });
      await mintTx.wait();
    }
    const newSupply = await bb.totalSupply();
    expect(newSupply.toNumber()).to.equal(
      currentSupply.toNumber() + iterations * maxTokens
    );
    const revealTx = await bb.reveal();

    if (mockVrfCoordinator) {
      const { events } = await revealTx.wait();
      const [reqId] = events.filter((x) => x.event === "RandomnessRequest")[0]
        ?.args;
      if (reqId) {
        await expect(
          mockVrfCoordinator.fulfillRandomWords(reqId, bb.address)
        ).to.emit(mockVrfCoordinator, "RandomWordsFulfilled");
      }
    } else {
      await revealTx.wait();
    }
  });

  it("Should be able to withdraw to treasury", async function () {
    const mintTx = await bb.withdraw();
    await mintTx.wait();
  });

  it("Should be able to change name and lore of a token", async function () {
    const nameChangeTx = await bb.setName(1, "Sick fuckin bear.");
    await nameChangeTx.wait();
    const loreChangeTx = await bb.setLore(
      1,
      "This is some sick ass lore baby."
    );
    await loreChangeTx.wait();
  });

  it("Should show unrevealed metadata, be able to reveal and show the correct metadata", async function () {
    expect(await bb.isRevealed()).to.eq(false);
    const base64Encoding = await bb.tokenURI(0);
    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(tokenMetadata.image).to.eq("ipfs://cid/hidden");
  });

  it("Should be able to reveal and show the correct metadata", async function () {
    const revealTx = await bb.setIsRevealed(true);
    await revealTx.wait();
    expect(await bb.isRevealed()).to.eq(true);
    const base64Encoding = await bb.tokenURI(0);
    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(tokenMetadata.image).to.eq(
      "ipfs://cid/479751331293378327078361890816"
    );
  });

  it("Should be able to set and unset background", async function () {
    const backgroundChangeTx = await bb.equip(0, "BACKGROUND", 1);
    await backgroundChangeTx.wait();
    const base64Encoding = await bb.tokenURI(0);
    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Background Id")
        .value
    ).to.eq("1");
    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Background")
        .value
    ).to.eq("Special background");
    // console.log("Dynamic background Metadata \n", tokenMetadata);
    const backgroundChangeTx1 = await bb.unequip(0, "BACKGROUND");
    await backgroundChangeTx1.wait();
    const base64Encoding1 = await bb.tokenURI(0);
    const tokenMetadata1 = JSON.parse(
      Buffer.from(
        base64Encoding1.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata1.equipped.find(
        (item) => item.trait_type === "Background Id"
      ).value
    ).to.eq("0");
    expect(
      tokenMetadata1.attributes.find((item) => item.trait_type === "Background")
        .value
    ).to.eq("Blue");
    // console.log("Default background metadata \n", tokenMetadata1);
    const dna = await bbRenderer.dna(0, bb.seed(0), await bb.getMetadata(0));
    expect(dna).to.eq("479751331293378327078361890816");
  });

  it("Should be able to set and unset head", async function () {
    const headChangeTx = await bb.equip(0, "HEAD", 9);
    await headChangeTx.wait();
    const base64Encoding = await bb.tokenURI(0);
    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Head Id").value
    ).to.eq("9");
    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Head").value
    ).to.eq("Purple Pirate Hat");
    // console.log("Dynamic head Metadata \n", tokenMetadata);
    const headChangeTx1 = await bb.unequip(0, "HEAD");
    await headChangeTx1.wait();
    const base64Encoding1 = await bb.tokenURI(0);
    const tokenMetadata1 = JSON.parse(
      Buffer.from(
        base64Encoding1.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata1.equipped.find((item) => item.trait_type === "Head Id")
        .value
    ).to.eq("0");
    expect(
      tokenMetadata1.attributes.find((item) => item.trait_type === "Head").value
    ).to.eq("Halo");
    // console.log("Default head metadata \n", tokenMetadata1);
  });

  it("Should be able to set and unset weapon", async function () {
    const equipWeaponTx = await bb.equip(0, "WEAPON", 2);
    await equipWeaponTx.wait();
    const base64Encoding = await bb.tokenURI(0);
    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Weapon Id")
        .value
    ).to.eq("2");
    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Weapon")
        .value
    ).to.eq("Special weapon");
    // console.log("Dynamic weapon metadata \n", tokenMetadata);
    const equipWeaponTx1 = await bb.unequip(0, "WEAPON");
    await equipWeaponTx1.wait();
    const base64Encoding1 = await bb.tokenURI(0);
    const tokenMetadata1 = JSON.parse(
      Buffer.from(
        base64Encoding1.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata1.equipped.find((item) => item.trait_type === "Weapon Id")
        .value
    ).to.eq("0");
    expect(
      tokenMetadata1.attributes.find((item) => item.trait_type === "Weapon")
        .value
    ).to.eq("NONE");
    // console.log("Default weapon metadata \n", tokenMetadata1);
  });

  it("Should be able to set and unset armor", async function () {
    const equipArmorTx = await bb.equip(0, "ARMOR", 3);
    await equipArmorTx.wait();
    const base64Encoding = await bb.tokenURI(0);
    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Armor Id")
        .value
    ).to.eq("3");
    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Armor").value
    ).to.eq("Special armor");
    // console.log("Dynamic armor metadata \n", tokenMetadata);
    const equipArmorTx1 = await bb.unequip(0, "ARMOR");
    await equipArmorTx1.wait();
    const base64Encoding1 = await bb.tokenURI(0);
    const tokenMetadata1 = JSON.parse(
      Buffer.from(
        base64Encoding1.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata1.equipped.find((item) => item.trait_type === "Armor Id")
        .value
    ).to.eq("0");
    expect(
      tokenMetadata1.attributes.find((item) => item.trait_type === "Armor")
        .value
    ).to.eq("NONE");
    // console.log("Default armor metadata \n", tokenMetadata1);
  });

  it("Should be able to set and unset face armor", async function () {
    const equipArmorTx = await bb.equip(0, "FACE_ARMOR", 4);
    await equipArmorTx.wait();
    const base64Encoding = await bb.tokenURI(0);
    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Face Armor Id")
        .value
    ).to.eq("4");
    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Face Armor")
        .value
    ).to.eq("Special face armor");
    // console.log("Dynamic face armor metadata \n", tokenMetadata);
    const equipArmorTx1 = await bb.unequip(0, "FACE_ARMOR");
    await equipArmorTx1.wait();
    const base64Encoding1 = await bb.tokenURI(0);
    const tokenMetadata1 = JSON.parse(
      Buffer.from(
        base64Encoding1.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata1.equipped.find(
        (item) => item.trait_type === "Face Armor Id"
      ).value
    ).to.eq("0");
    expect(
      tokenMetadata1.attributes.find((item) => item.trait_type === "Face Armor")
        .value
    ).to.eq("NONE");
    // console.log("Default face armor metadata \n", tokenMetadata1);
  });

  it("Should be able to set and unset eyewear", async function () {
    const equipArmorTx = await bb.equip(0, "EYEWEAR", 5);
    await equipArmorTx.wait();
    const base64Encoding = await bb.tokenURI(0);
    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Eyewear Id")
        .value
    ).to.eq("5");
    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Eyewear")
        .value
    ).to.eq("Special eyewear");
    // console.log("Dynamic eyewear metadata \n", tokenMetadata);
    const equipArmorTx1 = await bb.unequip(0, "EYEWEAR");
    await equipArmorTx1.wait();
    const base64Encoding1 = await bb.tokenURI(0);
    const tokenMetadata1 = JSON.parse(
      Buffer.from(
        base64Encoding1.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata1.equipped.find((item) => item.trait_type === "Eyewear Id")
        .value
    ).to.eq("0");
    expect(
      tokenMetadata1.attributes.find((item) => item.trait_type === "Eyewear")
        .value
    ).to.eq("NONE");
    // console.log("Default eyewear metadata \n", tokenMetadata1);
  });

  it("Should be able to set and unset misc.", async function () {
    const equipArmorTx = await bb.equip(0, "MISC", 6);
    await equipArmorTx.wait();
    const base64Encoding = await bb.tokenURI(0);
    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Misc Id").value
    ).to.eq("6");
    expect(
      tokenMetadata.attributes.find(
        (item) => item.trait_type === "Miscellaneous"
      ).value
    ).to.eq("Special misc");
    // console.log("Dynamic misc metadata \n", tokenMetadata);
    const equipArmorTx1 = await bb.unequip(0, "MISC");
    await equipArmorTx1.wait();
    const base64Encoding1 = await bb.tokenURI(0);
    const tokenMetadata1 = JSON.parse(
      Buffer.from(
        base64Encoding1.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata1.equipped.find((item) => item.trait_type === "Misc Id")
        .value
    ).to.eq("0");
    expect(
      tokenMetadata1.attributes.find(
        (item) => item.trait_type === "Miscellaneous"
      ).value
    ).to.eq("NONE");
    // console.log("Default misc metadata \n", tokenMetadata1);
  });

  it("Should be able to stake tokens", async function () {
    expect(await bb.isUnlocked(0)).to.eq(true);
    expect(await bb.isUnlocked(1)).to.eq(true);
    expect(await bb.isUnlocked(2)).to.eq(true);
    const stakedTx = await bbStake.stake([0, 1, 2]);
    await stakedTx.wait();
    // Show as locked
    expect(await bb.isUnlocked(0)).to.eq(false);
    expect(await bb.isUnlocked(1)).to.eq(false);
    expect(await bb.isUnlocked(2)).to.eq(false);
    // Show ownership remains
    expect(await bb.ownerOf(0)).to.eq(owner.address);
    expect(await bb.ownerOf(1)).to.eq(owner.address);
    expect(await bb.ownerOf(2)).to.eq(owner.address);
    expect(await bb.balanceOf(owner.address)).to.eq(26);
    const ownedTokenIds = await bb.walletOfOwner(owner.address);
    expect(ownedTokenIds.length).to.eq(26);
  });

  it("Should be able to add/remove XP from stake contract", async function () {
    expect(bb.equip(0, "WEAPON", 8)).to.be.revertedWith("ItemRequiresMoreXP()");

    const stakedTx = await bbStake.addXP(0, 1000000);
    await stakedTx.wait();

    // Equip an item that requires a minimum XP
    const weaponWithLevelTx = await bb.equip(0, "WEAPON", 8);
    await weaponWithLevelTx.wait();

    const base64Encoding = await bb.tokenURI(0);

    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );

    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Weapon")
        .value
    ).to.eq("Special weapon w/ level requirement");

    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "XP").value
    ).to.eq("1000000");

    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Level").value
    ).to.eq("23");

    const stakedTx1 = await bbStake.subtractXP(0, 500000);
    await stakedTx1.wait();

    const base64Encoding1 = await bb.tokenURI(0);

    const tokenMetadata1 = JSON.parse(
      Buffer.from(
        base64Encoding1.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );

    expect(
      tokenMetadata1.attributes.find((item) => item.trait_type === "XP").value
    ).to.eq("500000");

    expect(
      tokenMetadata1.attributes.find((item) => item.trait_type === "Level")
        .value
    ).to.eq("16");

    const action = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("XP_SYNC"));

    const syncMessage = ethers.utils.defaultAbiCoder.encode(
      ["uint256[]", "uint256[]", "bool"],
      [[0, 3, 2], [1000, 2000, 1000], true]
    );

    const textChildXPUpdate = await bbStake._processMessageFromChildTest(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "bytes"],
        [action, syncMessage]
      )
    );

    await textChildXPUpdate.wait();

    // Token 0
    let base64Encoding2 = await bb.tokenURI(0);
    let tokenMetadata2 = JSON.parse(
      Buffer.from(
        base64Encoding2.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata2.attributes.find((item) => item.trait_type === "XP").value
    ).to.eq("501000");

    // Token 2
    base64Encoding2 = await bb.tokenURI(2);
    tokenMetadata2 = JSON.parse(
      Buffer.from(
        base64Encoding2.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata2.attributes.find((item) => item.trait_type === "XP").value
    ).to.eq("1000");

    // Token 3
    base64Encoding2 = await bb.tokenURI(3);
    tokenMetadata2 = JSON.parse(
      Buffer.from(
        base64Encoding2.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );
    expect(
      tokenMetadata2.attributes.find((item) => item.trait_type === "XP").value
    ).to.eq("2000");
  });

  it("Should NOT be able to transfer locked", async function () {
    expect(bb.transferFrom(owner.address, alice.address, 1)).to.be.revertedWith(
      "0"
    );
    expect(bb.transferFrom(owner.address, alice.address, 2)).to.be.revertedWith(
      "0"
    );
    expect(bb.transferFrom(owner.address, alice.address, 3)).to.be.revertedWith(
      "0"
    );
  });

  it("Should be able to unstake tokens", async function () {
    const unstakedTx = await bbStake.unstake([0, 1]);
    await unstakedTx.wait();
    expect(await bb.isUnlocked(0)).to.eq(true);
    expect(await bb.isUnlocked(1)).to.eq(true);
    expect(await bb.isUnlocked(2)).to.eq(false);
  });

  it("Should be able to equip while tokens are staked", async function () {
    expect(await bb.ownerOf(2)).to.eq(owner.address);

    const backgroundChangeTx = await bb.equip(2, "BACKGROUND", 1);
    await backgroundChangeTx.wait();

    const weaponChangeTx = await bb.equip(2, "WEAPON", 2);
    await weaponChangeTx.wait();

    const armorChangeTx = await bb.equip(2, "ARMOR", 3);
    await armorChangeTx.wait();

    const faceArmorChangeTx = await bb.equip(2, "FACE_ARMOR", 4);
    await faceArmorChangeTx.wait();

    const eyewearChangeTx = await bb.equip(2, "EYEWEAR", 5);
    await eyewearChangeTx.wait();

    const miscChangeTx = await bb.equip(2, "MISC", 6);
    await miscChangeTx.wait();

    const base64Encoding = await bb.tokenURI(2);

    const tokenMetadata = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );

    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Background Id")
        .value
    ).to.eq("1");

    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Background")
        .value
    ).to.eq("Special background");

    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Weapon Id")
        .value
    ).to.eq("2");

    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Weapon")
        .value
    ).to.eq("Special weapon");

    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Armor Id")
        .value
    ).to.eq("3");

    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Armor").value
    ).to.eq("Special armor");

    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Face Armor Id")
        .value
    ).to.eq("4");

    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Face Armor")
        .value
    ).to.eq("Special face armor");

    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Eyewear Id")
        .value
    ).to.eq("5");

    expect(
      tokenMetadata.attributes.find((item) => item.trait_type === "Eyewear")
        .value
    ).to.eq("Special eyewear");

    expect(
      tokenMetadata.equipped.find((item) => item.trait_type === "Misc Id").value
    ).to.eq("6");

    expect(
      tokenMetadata.attributes.find(
        (item) => item.trait_type === "Miscellaneous"
      ).value
    ).to.eq("Special misc");

    // console.log("Dynamic background Metadata \n", tokenMetadata);
  });

  it("Should be able to transfer after unlocked, unequip get item, and transfer back without the item", async function () {
    const unstakedTx = await bbStake.unstake([2]);
    await unstakedTx.wait();
    const transferTx = await bb.transferFrom(owner.address, alice.address, 2);
    await transferTx.wait();
    expect(await bb.ownerOf(2)).to.eq(alice.address);
    expect(await bbShop.balanceOf(alice.address, 5)).to.eq(0);

    const equipArmorTx1 = await bb.connect(alice).unequip(2, "EYEWEAR");
    await equipArmorTx1.wait();

    expect(await bbShop.balanceOf(alice.address, 5)).to.eq(1);

    const transferTx1 = await bb
      .connect(alice)
      .transferFrom(alice.address, owner.address, 2);
    await transferTx1.wait();
    expect(await bb.ownerOf(2)).to.eq(owner.address);
  });

  it("Should be able to transfer after unlocked", async function () {
    const transferTx = await bb.transferFrom(owner.address, alice.address, 1);
    await transferTx.wait();
    expect(await bb.ownerOf(1)).to.eq(alice.address);
    const transferTx1 = await bb
      .connect(alice)
      .transferFrom(alice.address, owner.address, 1);
    await transferTx1.wait();
    expect(await bb.ownerOf(1)).to.eq(owner.address);
  });

  it("Should be able to claim free mint", async function () {
    const mintTx = await bb.claim([1, 4], {
      gasLimit: 200000,
    });
    await mintTx.wait();
    const revealTx = await bb.reveal();
    if (mockVrfCoordinator) {
      const { events } = await revealTx.wait();
      const [reqId] = events.filter((x) => x.event === "RandomnessRequest")[0]
        ?.args;
      if (reqId) {
        await expect(
          mockVrfCoordinator.fulfillRandomWords(reqId, bb.address)
        ).to.emit(mockVrfCoordinator, "RandomWordsFulfilled");
      }
    } else {
      await revealTx.wait();
    }
    expect(await bbPass.ownerOf(1)).to.eq(
      "0x000000000000000000000000000000000000dEaD"
    );
    expect(await bbPass.ownerOf(4)).to.eq(
      "0x000000000000000000000000000000000000dEaD"
    );
  });

  it("Should be able to get token and parse out dna to segments", async function () {
    // weapon 8 is equipped
    // Add dynamic bg and armor items
    const bgTx = await bb.equip(0, "BACKGROUND", 1);
    await bgTx.wait();
    const armorTx = await bb.equip(0, "ARMOR", 3);
    await armorTx.wait();

    const base64Encoding = await bb.tokenURI(0);

    const md = JSON.parse(
      Buffer.from(
        base64Encoding.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );

    const getGene = (dna, position) => {
      const shiftBy = 8 * position;
      const gene = dna.and(ethers.BigNumber.from(0xff).shl(shiftBy));
      return gene.shr(shiftBy);
    };

    let dna = ethers.BigNumber.from(md.dna);
    let backgroundId = getGene(dna, 12);
    let skinId = getGene(dna, 11);
    let headId = getGene(dna, 10);
    let eyesId = getGene(dna, 9);
    let mouthId = getGene(dna, 8);
    let outfitId = getGene(dna, 7);
    let dynamicBackgroundId = getGene(dna, 6);
    let weaponId = getGene(dna, 5);
    let armorId = getGene(dna, 4);
    let faceArmorId = getGene(dna, 3);
    let dynamicEyewearId = getGene(dna, 2);
    let miscId = getGene(dna, 1);
    let dynamicHeadId = getGene(dna, 0);

    // console.log(JSON.stringify(md, null, 2));

    expect(backgroundId.toString()).to.eq("6");
    expect(skinId.toString()).to.eq("14");
    expect(headId.toString()).to.eq("41");
    expect(eyesId.toString()).to.eq("0");
    expect(mouthId.toString()).to.eq("6");
    expect(outfitId.toString()).to.eq("14");
    expect(dynamicBackgroundId.toString()).to.eq("1");
    expect(armorId.toString()).to.eq("3");
    expect(weaponId.toString()).to.eq("8");
    expect(faceArmorId.toString()).to.eq("0");
    expect(dynamicEyewearId.toString()).to.eq("0");
    expect(miscId.toString()).to.eq("0");
    expect(dynamicHeadId.toString()).to.eq("0");
    expect(dna.toString()).to.eq("479751331293378617362316525568");

    // unequip
    const bgTx1 = await bb.unequip(0, "BACKGROUND");
    await bgTx1.wait();
    const armorTx1 = await bb.unequip(0, "ARMOR");
    await armorTx1.wait();

    const newHeadTx = await bb.equip(0, "HEAD", 9);
    await newHeadTx.wait();

    const base64Encoding1 = await bb.tokenURI(0);
    const md1 = JSON.parse(
      Buffer.from(
        base64Encoding1.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("ascii")
    );

    dna = ethers.BigNumber.from(md1.dna);
    backgroundId = getGene(dna, 12);
    skinId = getGene(dna, 11);
    headId = getGene(dna, 10);
    eyesId = getGene(dna, 9);
    mouthId = getGene(dna, 8);
    outfitId = getGene(dna, 7);
    dynamicBackgroundId = getGene(dna, 6);
    weaponId = getGene(dna, 5);
    armorId = getGene(dna, 4);
    faceArmorId = getGene(dna, 3);
    dynamicEyewearId = getGene(dna, 2);
    miscId = getGene(dna, 1);
    dynamicHeadId = getGene(dna, 0);

    expect(backgroundId.toString()).to.eq("6");
    expect(skinId.toString()).to.eq("14");
    expect(headId.toString()).to.eq("41");
    expect(eyesId.toString()).to.eq("0");
    expect(mouthId.toString()).to.eq("6");
    expect(outfitId.toString()).to.eq("14");
    expect(dynamicBackgroundId.toString()).to.eq("0");
    expect(armorId.toString()).to.eq("0");
    expect(weaponId.toString()).to.eq("8");
    expect(faceArmorId.toString()).to.eq("0");
    expect(dynamicEyewearId.toString()).to.eq("0");
    expect(miscId.toString()).to.eq("0");
    expect(dynamicHeadId.toString()).to.eq("9");
    expect(dna.toString()).to.eq("479751331293378335874454913033");
  });

  it("Should be able to get airdrop items from rewardable claims", async function () {
    const action = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("REWARDS_CLAIM")
    );

    const syncMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256[]"],
      [owner.address, [1, 2, 3, 4, 5, 6]]
    );

    const rewardsClaimTx = await bbStake._processMessageFromChildTest(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "bytes"],
        [action, syncMessage]
      )
    );

    await rewardsClaimTx.wait();
  });

  it("Should be able to get token URI", async function () {
    const mints = [];
    const currentSupply = await bb.totalSupply();
    for (let i = 0; i < currentSupply; i++) {
      const base64Encoding = await bb.tokenURI(i);
      // console.log(
      //   Buffer.from(
      //     base64Encoding.replace("data:application/json;base64,", ""),
      //     "base64"
      //   ).toString("ascii")
      // );

      mints.push(
        JSON.parse(
          Buffer.from(
            base64Encoding.replace("data:application/json;base64,", ""),
            "base64"
          ).toString("ascii")
        )
      );
    }

    const frequencies = mints.reduce((acc, item) => {
      const { attributes, dna } = item;

      if (!acc.dna) {
        acc.dna = {};
      }

      if (!acc.dna[dna]) {
        acc.dna[dna] = 1;
      } else {
        acc.dna[dna] += 1;
      }

      attributes.forEach(({ trait_type, value }) => {
        if (!acc[trait_type]) {
          acc[trait_type] = {};
        }

        if (!acc[trait_type][value]) {
          acc[trait_type][value] = 0;
        }

        acc[trait_type][value] += 1;
      });

      return acc;
    }, {});

    fs.writeFileSync(
      `reveals/bb_frequencies_${new Date().getTime()}.json`,
      JSON.stringify(frequencies, null, 2)
    );
  });

  it("Should be able to team mint only once", async function () {
    const teamMintTx = await bb.teamMints(alice.address);
    await teamMintTx.wait();
    expect(await bb.balanceOf(alice.address)).to.equal(129);
    expect(await bb.teamMintAmount()).to.equal(0);
  });
});
