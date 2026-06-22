require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // OpenZeppelin v5.1+ utilise l'opcode `mcopy` (introduit par le hardfork
      // Cancun). Polygon (mainnet + Amoy) supporte Cancun, on cible donc cet EVM.
      evmVersion: "cancun",
    },
  },
  networks: {
    amoy: {
      url: process.env.AMOY_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
    },
  },
  // Vérification du code source sur Polygonscan via l'API Etherscan V2.
  // Une seule clé Etherscan (chaîne) suffit pour toutes les chaînes (dont Amoy).
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  sourcify: {
    enabled: false,
  },
};