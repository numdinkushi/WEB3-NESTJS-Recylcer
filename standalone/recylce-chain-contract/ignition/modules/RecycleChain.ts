// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RecycleChainModule = buildModule("RecycleChainModule", (m) => {
  const recycleChain = m.contract("RecycleChain", []);

  return { recycleChain };
});

export default RecycleChainModule;
