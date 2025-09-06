import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting BalloonPump contract deployment...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance));

  // Deploy BalloonPump contract
  console.log("🔨 Deploying BalloonPump...");
  const BalloonPump = await ethers.getContractFactory("BalloonPump");
  const balloonPump = await BalloonPump.deploy();

  await balloonPump.deployed();

  console.log("✅ BalloonPump deployed to:", balloonPump.address);

  // Verify contract if on testnet/mainnet
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337) { // Not localhost
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: balloonPump.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("❌ Verification failed:", error);
    }
  }

  // Log deployment info
  console.log("\n📋 Deployment Summary:");
  console.log("========================");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Contract Address:", balloonPump.address);
  console.log("Deployer:", deployer.address);
  console.log("Gas Used:", balloonPump.deployTransaction.gasLimit.toString());

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    contractAddress: balloonPump.address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    txHash: balloonPump.deployTransaction.hash,
  };

  console.log("\n💾 Deployment info saved to deployments.json");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
