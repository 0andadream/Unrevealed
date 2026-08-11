const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying IncoGrove from", deployer.address);

  const Factory = await hre.ethers.getContractFactory("IncoGrove");
  const grove = await Factory.deploy();
  await grove.waitForDeployment();
  const address = await grove.getAddress();
  console.log("IncoGrove:", address);

  // Seed ETH for any future fee ops / safety
  await (
    await deployer.sendTransaction({
      to: address,
      value: hre.ethers.parseEther("0.01"),
    })
  ).wait();

  const chainId = (await hre.ethers.provider.getNetwork()).chainId.toString();
  const out = {
    network: hre.network.name,
    chainId,
    deployer: deployer.address,
    IncoGrove: address,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(__dirname, `../deployments.${hre.network.name}.json`),
    JSON.stringify(out, null, 2)
  );

  const env = [
    `NEXT_PUBLIC_CHAIN_ID=${chainId}`,
    `NEXT_PUBLIC_INCO_GROVE=${address}`,
    `NEXT_PUBLIC_RPC_URL=https://base-sepolia-rpc.publicnode.com`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(__dirname, "../.env.local"), env);
  fs.writeFileSync(path.join(__dirname, "../.env.production"), env);
  console.log("Wrote .env.local and .env.production");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
