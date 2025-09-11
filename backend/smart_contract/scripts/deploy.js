const hre = require("hardhat");

async function main() {
  const transaction = await hre.ethers.deployContract("Transaction");
  await transaction.waitForDeployment();
  console.log("Transaction deployed to:", transaction.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
