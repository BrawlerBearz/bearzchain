import { task } from "hardhat/config";
import fs from "fs";
import { range, reduce } from "lodash";

const sumWeights = () => {
  const reducer = (p, c, i) => {
    if (c[0] <= 0)
      throw {
        name: "WeightError",
        message: `Invalid weight ${c[0]} at index ${i}. Weight cannot be negative or zero.`,
      };
    return p + c[0];
  };
  return (a) => Array.prototype.reduce.call(a, reducer, 0);
};

const walker = (weightMap) => {
  const n = weightMap.length;
  const sum = sumWeights()(weightMap);
  const weights = weightMap.map((x) => (x[0] * n) / sum);

  const shorts = [];
  const longs = [];
  for (let i = 0, len = weights.length; i < len; ++i) {
    const p = weights[i];
    if (p < 1) {
      shorts.push(i);
    } else if (p > 1) {
      longs.push(i);
    }
  }

  const inx = Array.from(Array(n)).map((_) => 0);

  while (shorts.length && longs.length) {
    const j = shorts.pop();
    const k = longs[longs.length - 1];
    inx[j] = k;
    weights[k] -= 1 - weights[j];
    if (weights[k] < 1) {
      shorts.push(k);
      longs.pop();
    }
  }

  return (powBasis: number) => {
    return {
      run: (seed: any, shr: number) => {
        const traitSeed = seed.shr(shr).mask(16) as any;
        const trait = traitSeed.mod(weights.length);
        const sample = traitSeed.shr(8);
        const weightValue = Math.floor(weights[trait] * Math.pow(2, powBasis));
        const k = sample.lt(weightValue) ? trait : inx[trait];
        return weightMap[k][1];
      },
      probabilities: weights.map((v) => Math.floor(v * Math.pow(2, powBasis))),
      alias: inx,
    };
  };
};

const BASIS = 10000;

/*
Gray
Moss
Orange
Red
Green
Blue
Brown
Smoke
Red smoke
Maroon
Purple
Navy
Graffiti
Cyber Safari
 */

const backgrounds = {
  "0": {
    v: "Gray",
    p: 1200,
  },
  "1": {
    v: "Moss",
    p: 1100,
  },
  "2": {
    v: "Orange",
    p: 600,
  },
  "3": {
    v: "Red",
    p: 900,
  },
  "4": {
    v: "Green",
    p: 1050,
  },
  "5": {
    v: "Blue",
    p: 750,
  },
  "6": {
    v: "Brown",
    p: 1000,
  },
  "7": {
    v: "Smoke",
    p: 300,
  },
  "8": {
    v: "Red Smoke",
    p: 200,
  },
  "9": {
    v: "Maroon",
    p: 1000,
  },
  "10": {
    v: "Purple",
    p: 750,
  },
  "11": {
    v: "Navy",
    p: 1000,
  },
  "12": {
    v: "Graffiti",
    p: 100,
  },
  "13": {
    v: "Cyber Safari",
    p: 50,
  },
};

/*
Plasma
Sun Breaker
Negative
Mash
Grey Tiger
Polar Bear
Tan Tiger
Tiger
Chocolate striped
Ripper
Brown Panda
Panda
Brown
Grey
Tan
Black bear
Toxic
Green chalk
Negative tiger
Metal
Orange
 */

const skins = {
  "0": {
    v: "Plasma",
    p: 65,
  },
  "1": {
    v: "Sun Breaker",
    p: 30,
  },
  "2": {
    v: "Negative",
    p: 130,
  },
  "3": {
    v: "Mash",
    p: 650,
  },
  "4": {
    v: "Grey Tiger",
    p: 175,
  },
  "5": {
    v: "Polar Bear",
    p: 400,
  },
  "6": {
    v: "Tan Tiger",
    p: 245,
  },
  "7": {
    v: "Tiger",
    p: 350,
  },
  "8": {
    v: "Chocolate Striped",
    p: 595,
  },
  "9": {
    v: "Ripper",
    p: 675,
  },
  "10": {
    v: "Brown Panda",
    p: 350,
  },
  "11": {
    v: "Panda",
    p: 475,
  },
  "12": {
    v: "Brown",
    p: 700,
  },
  "13": {
    v: "Grey",
    p: 1045,
  },
  "14": {
    v: "Tan",
    p: 1200,
  },
  "15": {
    v: "Black Bear",
    p: 500,
  },
  "16": {
    v: "Toxic",
    p: 140,
  },
  "17": {
    v: "Green Chalk",
    p: 275,
  },
  "18": {
    v: "Negative Tiger",
    p: 100,
  },
  "19": {
    v: "Metal",
    p: 1000,
  },
  "20": {
    v: "Orange",
    p: 900,
  },
};

/*
Green Soda Hat
Orange Soda Hat
Golden Gladiator Helmet
Gladiator Helmet
Bone Head
Holiday Beanie
Pan
Snow Trooper
Bearlympics Headband
Sea Cap
Green Goggles
Red Goggles
Society Cap
Fireman Hat
Vendor Cap
Banana
Cake
Rabbit Ears
Party Hat
Rice Hat
None
Alarm
Karate Band
Butchered
Green Bear Rag
Red Bear Rag
Wizard Hat
Ninja Headband
Sombrero
Blue Ice Cream
Red Ice Cream
Viking Helmet
Snow Hat
Green Bucket Hat
Blue Bucket Hat
Red Bucket Hat
Chef Hat
Bearz Police
Cowboy Hat
Straw Hat
Kings Crown
Halo
Jester Hat
Dark Piratez
Santa Hat
Cyber rice hat
Wulfz
Two Toned Cap
Black Cap
Green Cap
Trainer Cap
Horn
Green Punk Hair
Blue Punk Hair
Red Punk Hair
Purple Punk Hair
Grey poof
Blue Beanie
Orange Beanie
Red Beanie
Green Flames
Blue Flames
Flames
Grey Headphones
Blue Headphones
Red Headphones
Black Snapback
Green Snapback
Blue Snapback
Two Tones Snapback
Red Snapback
Vault Bear
 */

const heads = {
  "0": {
    v: "Green Soda Hat",
    p: 75,
  },
  "1": {
    v: "Orange Soda Hat",
    p: 75,
  },
  "2": {
    v: "Golden Gladiator Helmet",
    p: 7,
  },
  "3": {
    v: "Gladiator Helmet",
    p: 78,
  },
  "4": {
    v: "Bone Head",
    p: 50,
  },
  "5": {
    v: "Holiday Beanie",
    p: 57,
  },
  "6": {
    v: "Pan",
    p: 53,
  },
  "7": {
    v: "Snow Trooper",
    p: 59,
  },
  "8": {
    v: "Bearlympics Headband",
    p: 77,
  },
  "9": {
    v: "Sea Cap",
    p: 53,
  },
  "10": {
    v: "Green Goggles",
    p: 79,
  },
  "11": {
    v: "Red Goggles",
    p: 91,
  },
  "12": {
    v: "Society Cap",
    p: 72,
  },
  "13": {
    v: "Fireman Hat",
    p: 69,
  },
  "14": {
    v: "Vendor Cap",
    p: 64,
  },
  "15": {
    v: "Banana",
    p: 43,
  },
  "16": {
    v: "Cake",
    p: 47,
  },
  "17": {
    v: "Rabbit Ears",
    p: 48,
  },
  "18": {
    v: "Party Hat",
    p: 60,
  },
  "19": {
    v: "Rice Hat",
    p: 65,
  },
  "20": {
    v: "None",
    p: 30,
  },
  "21": {
    v: "Alarm",
    p: 45,
  },
  "22": {
    v: "Karate Band",
    p: 70,
  },
  "23": {
    v: "Butchered",
    p: 50,
  },
  "24": {
    v: "Green Bear Rag",
    p: 70,
  },
  "25": {
    v: "Red Bear Rag",
    p: 120,
  },
  "26": {
    v: "Wizard Hat",
    p: 60,
  },
  "27": {
    v: "Ninja Headband",
    p: 80,
  },
  "28": {
    v: "Sombrero",
    p: 55,
  },
  "29": {
    v: "Blue Ice Cream",
    p: 60,
  },
  "30": {
    v: "Red Ice Cream",
    p: 61,
  },
  "31": {
    v: "Viking Helmet",
    p: 90,
  },
  "32": {
    v: "Snow Hat",
    p: 80,
  },
  "33": {
    v: "Green Bucket Hat",
    p: 220,
  },
  "34": {
    v: "Blue Bucket Hat",
    p: 150,
  },
  "35": {
    v: "Red Bucket Hat",
    p: 225,
  },
  "36": {
    v: "Chef Hat",
    p: 55,
  },
  "37": {
    v: "Bearz Police",
    p: 75,
  },
  "38": {
    v: "Cowboy Hat",
    p: 85,
  },
  "39": {
    v: "Straw Hat",
    p: 65,
  },
  "40": {
    v: "Kings Crown",
    p: 9,
  },
  "41": {
    v: "Halo",
    p: 40,
  },
  "42": {
    v: "Jester Hat",
    p: 50,
  },
  "43": {
    v: "Dark Piratez",
    p: 40,
  },
  "44": {
    v: "Santa Hat",
    p: 50,
  },
  "45": {
    v: "Cyber Rice hat",
    p: 30,
  },
  "46": {
    v: "Wulfz",
    p: 10,
  },
  "47": {
    v: "Two Toned Cap",
    p: 220,
  },
  "48": {
    v: "Black Cap",
    p: 175,
  },
  "49": {
    v: "Green Cap",
    p: 150,
  },
  "50": {
    v: "Trainer Cap",
    p: 35,
  },
  "51": {
    v: "Horn",
    p: 65,
  },
  "52": {
    v: "Green Punk Hair",
    p: 420,
  },
  "53": {
    v: "Blue Punk Hair",
    p: 365,
  },
  "54": {
    v: "Red Punk Hair",
    p: 320,
  },
  "55": {
    v: "Purple Punk Hair",
    p: 180,
  },
  "56": {
    v: "Grey Poof",
    p: 101,
  },
  "57": {
    v: "Blue Beanie",
    p: 120,
  },
  "58": {
    v: "Orange Beanie",
    p: 110,
  },
  "59": {
    v: "Red Beanie",
    p: 145,
  },
  "60": {
    v: "Green Flames",
    p: 12,
  },
  "61": {
    v: "Blue Flames",
    p: 30,
  },
  "62": {
    v: "Flames",
    p: 50,
  },
  "63": {
    v: "Grey Headphones",
    p: 200,
  },
  "64": {
    v: "Blue Headphones",
    p: 175,
  },
  "65": {
    v: "Red Headphones",
    p: 155,
  },
  "66": {
    v: "Black Snapback",
    p: 175,
  },
  "67": {
    v: "Green Snapback",
    p: 140,
  },
  "68": {
    v: "Blue Snapback",
    p: 125,
  },
  "69": {
    v: "Two Tones Snapback",
    p: 150,
  },
  "70": {
    v: "Red Snapback",
    p: 165,
  },
  "71": {
    v: "Vault Bear",
    p: 65,
  },
};

/*
Real Green
Black
Black Side Eye
Real Black
Real Blue
Honey
Ghost Eyes
Snake
Worried
Cyber Eyes
Lizard Eyes
Brown Eyes
Bloodshot Eyes
 */
const eyes = {
  "0": {
    v: "Real Green",
    p: 1080,
  },
  "1": {
    v: "Black",
    p: 1760,
  },
  "2": {
    v: "Black Side Eye",
    p: 800,
  },
  "3": {
    v: "Real Black",
    p: 1600,
  },
  "4": {
    v: "Real Blue",
    p: 1155,
  },
  "5": {
    v: "Honey",
    p: 775,
  },
  "6": {
    v: "Ghost",
    p: 500,
  },
  "7": {
    v: "Snake",
    p: 175,
  },
  "8": {
    v: "Worried",
    p: 375,
  },
  "9": {
    v: "Cyber",
    p: 40,
  },
  "10": {
    v: "Lizard",
    p: 175,
  },
  "11": {
    v: "Brown",
    p: 1340,
  },
  "12": {
    v: "Bloodshot",
    p: 225,
  },
};

/*
Serious
Tongue
Ramen Mouth
Lollipop
Orge
Tiger
Smile
Angry
Worried
Rage
Bloody fangs
 */
const mouth = {
  "0": {
    v: "Serious",
    p: 1834,
  },
  "1": {
    v: "Tongue",
    p: 750,
  },
  "2": {
    v: "Ramen",
    p: 150,
  },
  "3": {
    v: "Lollipop",
    p: 250,
  },
  "4": {
    v: "Orge",
    p: 1320,
  },
  "5": {
    v: "Tiger",
    p: 750,
  },
  "6": {
    v: "Smile",
    p: 2216,
  },
  "7": {
    v: "Angry",
    p: 1480,
  },
  "8": {
    v: "Worried",
    p: 700,
  },
  "9": {
    v: "Rage",
    p: 500,
  },
  "10": {
    v: "Bloody Fangs",
    p: 50,
  },
};

/*
Dark Space Suit
Golden Space Suit
Space Suit
Rugged Jacket
Multi Jacket
Plated Suit
T16 Jacket
Sand Raider Armor
Raider Armor
Tuxedo
Blue Don Jacket
Green Don Jacket
Purple Don Jacket
Red Don Jacket
Hunter Jacket
Brawler Bearz Hoodie
Quartz Paw Hoodie
Blue Paw Hoodie
Blue Two Tone Hoodie
Red Two Tone Hoodie
Purple Two Tone Hoodie
Orange Paw Hoodie
Green Paw Hoodie
MVHQ Hoodie
Green Bearz Hoodie
Read Bearz Hoodie
Street Hoodie
Ranger Trench Jacket
Night Rider Jacket
Blue Utility Jacket
Orange Utility Jacket
Red Utility Jacket
Brown Neo Jacket
Green Neo Jacet
Forester Jacket
Robe
Champions Robe
Red Flame Pull-Over
Blue Flame Pull-Over
Leather Jacket
Chain
Tech Suit
Red 10-Plate Armor
Blue 10-Plate Armor
Orange 10-Plate Armor
Green 9-Plate Armor
Orange 9-Plate Armor
Blue 9-Plate Armor
Red 9-Plate Armor
Forester Band
Purple Striped Band
Green Striped Band
Green Bandana
Blue Striped Band
Red Striped Band
Red Bandana
Red Arm Band
Blue Arm Band
Black Arm Band
Black T-Shirt
White T-Shirt
Two Toned Tee
Two Tone Long Sleeve
Bearz Long Sleeve
Bearz T-Shirt
Graphic Tee
Black Graphic Tee
Dark piratez suit
Vault shirt
None
 */
const outfit = {
  "0": {
    v: "Dark Space Suit",
    p: 30,
  },
  "1": {
    v: "Golden Space Suit",
    p: 10,
  },
  "2": {
    v: "Space Suit",
    p: 100,
  },
  "3": {
    v: "Rugged Jacket",
    p: 80,
  },
  "4": {
    v: "Multi Jacket",
    p: 120,
  },
  "5": {
    v: "Plated Suit",
    p: 50,
  },
  "6": {
    v: "T16 Jacket",
    p: 75,
  },
  "7": {
    v: "Sand Raider Armor",
    p: 60,
  },
  "8": {
    v: "Raider Armor",
    p: 90,
  },
  "9": {
    v: "Tuxedo",
    p: 45,
  },
  "10": {
    v: "Blue Don Jacket",
    p: 120,
  },
  "11": {
    v: "Green Don Jacket",
    p: 110,
  },
  "12": {
    v: "Purple Don Jacket",
    p: 87,
  },
  "13": {
    v: "Red Don Jacket",
    p: 115,
  },
  "14": {
    v: "Hunter Jacket",
    p: 120,
  },
  "15": {
    v: "Brawler Bearz Hoodie",
    p: 125,
  },
  "16": {
    v: "Quartz Paw Hoodie",
    p: 125,
  },
  "17": {
    v: "Cyan Paw Hoodie",
    p: 125,
  },
  "18": {
    v: "Blue Two Tone Hoodie",
    p: 200,
  },
  "19": {
    v: "Red Two Tone Hoodie",
    p: 225,
  },
  "20": {
    v: "Purple Two Tone Hoodie",
    p: 175,
  },
  "21": {
    v: "Orange Paw Hoodie",
    p: 110,
  },
  "22": {
    v: "Green Paw Hoodie",
    p: 135,
  },
  "23": {
    v: "MVHQ Hoodie",
    p: 10,
  },
  "24": {
    v: "Green Bearz Hoodie",
    p: 165,
  },
  "25": {
    v: "Red Bearz Hoodie",
    p: 225,
  },
  "26": {
    v: "Street Hoodie",
    p: 175,
  },
  "27": {
    v: "Ranger Trench Jacket",
    p: 90,
  },
  "28": {
    v: "Night Rider Jacket",
    p: 85,
  },
  "29": {
    v: "Blue Utility Jacket",
    p: 90,
  },
  "30": {
    v: "Orange Utility Jacket",
    p: 100,
  },
  "31": {
    v: "Red Utility Jacket",
    p: 100,
  },
  "32": {
    v: "Brown Neo Jacket",
    p: 90,
  },
  "33": {
    v: "Green Neo Jacet",
    p: 75,
  },
  "34": {
    v: "Forester Jacket",
    p: 90,
  },
  "35": {
    v: "Robe",
    p: 50,
  },
  "36": {
    v: "Champions Robe",
    p: 40,
  },
  "37": {
    v: "Red Flame Pullover",
    p: 200,
  },
  "38": {
    v: "Blue Flame Pullover",
    p: 150,
  },
  "39": {
    v: "Leather Jacket",
    p: 180,
  },
  "40": {
    v: "Chain",
    p: 69,
  },
  "41": {
    v: "Tech Suit",
    p: 55,
  },
  "42": {
    v: "Red 10 Plate Armor",
    p: 90,
  },
  "43": {
    v: "Blue 10 Plate Armor",
    p: 70,
  },
  "44": {
    v: "Orange 10 Plate Armor",
    p: 75,
  },
  "45": {
    v: "Green 9 Plate Armor",
    p: 80,
  },
  "46": {
    v: "Orange 9 Plate Armor",
    p: 75,
  },
  "47": {
    v: "Blue 9 Plate Armor",
    p: 70,
  },
  "48": {
    v: "Red 9 Plate Armor",
    p: 90,
  },
  "49": {
    v: "Forester Bandana",
    p: 80,
  },
  "50": {
    v: "Purple Striped Bandana",
    p: 55,
  },
  "51": {
    v: "Green Striped Bandana",
    p: 58,
  },
  "52": {
    v: "Green Bandana",
    p: 78,
  },
  "53": {
    v: "Blue Striped Bandana",
    p: 57,
  },
  "54": {
    v: "Red Striped Bandana",
    p: 56,
  },
  "55": {
    v: "Red Bandana",
    p: 80,
  },
  "56": {
    v: "Red Arm Bandana",
    p: 80,
  },
  "57": {
    v: "Blue Arm Bandana",
    p: 80,
  },
  "58": {
    v: "Black Arm Bandana",
    p: 71,
  },
  "59": {
    v: "Black Tee",
    p: 110,
  },
  "60": {
    v: "White Tee",
    p: 120,
  },
  "61": {
    v: "Two Toned Tee",
    p: 130,
  },
  "62": {
    v: "Two Tone Long Sleeve",
    p: 120,
  },
  "63": {
    v: "Bearz Long Sleeve",
    p: 130,
  },
  "64": {
    v: "Bearz Tee",
    p: 70,
  },
  "65": {
    v: "Graphic Tee",
    p: 140,
  },
  "66": {
    v: "Black Graphic Tee",
    p: 120,
  },
  "67": {
    v: "Dark Piratez Suit",
    p: 100,
  },
  "68": {
    v: "Green Arm Bandana",
    p: 78,
  },
  "69": {
    v: "Black Bearz Hoodie",
    p: 200,
  },
  "70": {
    v: "White Futura Jacket",
    p: 175,
  },
  "71": {
    v: "Orange Futura Jacket",
    p: 155,
  },
  "72": {
    v: "Red Futura Jacket",
    p: 200,
  },
  "73": {
    v: "Damaged Shirt",
    p: 125,
  },
  "74": {
    v: "None",
    p: 30,
  },
};

task("generate-bb-alias", "Generates bb alias method values").setAction(
  async (taskArgs, hre) => {
    let code = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// GENERATED CODE DO NOT MODIFY!

/*******************************************************************************
 * Genes
 * Developed By: @ScottMitchell18
 * Each of those seedTo{Group} function select 4 bytes from the seed
 * and use those selected bytes to pick a trait using the A.J. Walker
 * algorithm O(1) complexity. The rarity and aliases are calculated off-chain.
 *******************************************************************************/
    
  library Genes {
    function getGene(uint256 chromosome, uint32 position)
        internal
        pure
        returns (uint256)
      {
          unchecked {
              uint32 shift = 8 * position;
              return (chromosome & (0xFF << shift)) >> shift;
          }
      }
    
    `;

    const functionSnippet = (groupName, probablities, aliases, shr) => {
      return `
        function seedTo${groupName}(uint256 seed) internal pure returns (uint256) {
          unchecked {
              uint256 traitSeed = (seed >> ${shr}) & 0xFFFF;
              uint256 trait = traitSeed % ${probablities.length};
              if (
                  traitSeed >> 8 <
                  [${probablities.join(", ")}][
                      trait
                  ]
              ) return trait;
              return [${aliases.join(", ")}][trait];
          }
      }
      `;
    };

    const valueSnippet = (label, values) => {
      return `
        function get${label}Value(uint256 chromosome)
          public
          pure
          returns (string memory)
      {
          uint256 gene = get${label}(chromosome);
          ${values
            .map(
              ({ index, label }) => `
              if (gene == ${index}) {
                return "${label}";
              }`
            )
            .join("\n")}
          return "";
      }
      `;
    };

    const geneSnippet = (label, position) => {
      return `
        function get${label}(uint256 chromosome) internal pure returns (uint256) {
          return getGene(chromosome, ${position - 1});
        }
      `;
    };

    const traitGroups = [
      {
        label: "Background",
        data: backgrounds,
      },
      {
        label: "Skin",
        data: skins,
      },
      {
        label: "Head",
        data: heads,
      },
      {
        label: "Eyes",
        data: eyes,
      },
      {
        label: "Mouth",
        data: mouth,
      },
      {
        label: "Outfit",
        data: outfit,
      },
    ];

    for (let i = 0; i < traitGroups.length; i++) {
      const { label, data } = traitGroups[i];

      const values = reduce(
        data,
        (acc, value, key) => {
          acc.push([value.p, key]);
          return acc;
        },
        []
      );

      const table = walker(values);

      const { run, probabilities, alias } = table(8);

      const selected = range(0, 6001).map((_) =>
        run(
          hre.ethers.BigNumber.from(hre.ethers.utils.randomBytes(32)),
          16 * (i + 1)
        )
      );

      const f = selected.reduce((acc, item) => {
        const { v: traitLabel } = traitGroups[i].data[String(item)];
        if (!acc[traitLabel]) {
          acc[traitLabel] = 1;
        } else {
          acc[traitLabel] += 1;
        }
        return acc;
      }, {});

      console.log({
        index: i,
        group: label,
        functionName: `seedTo${label}`,
        freqs: f,
        percents: reduce(
          f,
          (acc, value, key) => {
            acc[key] = value / selected.length;
            return acc;
          },
          {}
        ),
        probabilities,
        alias,
      });

      code += functionSnippet(label, probabilities, alias, 16 * (i + 1));

      code += valueSnippet(
        label,
        reduce(
          traitGroups[i].data,
          (acc, value, key) => {
            acc.push({ index: key, label: value.v });
            return acc;
          },
          []
        )
      );

      code += geneSnippet(label, traitGroups.length - i);
    }

    code += `
    function seedToChromosome(uint256 seed)
        internal
        pure
        returns (uint256 chromosome)
    {
    
        ${traitGroups
          .map(({ label, data }, index) => {
            return `
            chromosome |= seedTo${label}(seed);
            ${index !== traitGroups.length - 1 ? "chromosome <<= 8;" : ""}
          `;
          })
          .join("\n")}
    }
    `;

    code += "}";

    fs.writeFileSync(`contracts/Genes.sol`, code);
  }
);
