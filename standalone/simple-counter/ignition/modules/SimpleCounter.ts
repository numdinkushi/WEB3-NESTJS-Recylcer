// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SimpleCounterModule = buildModule("SimpleCounterModule", (m) => {
  const initialNumber = 42;
  const simpleCounter = m.contract("SimpleCounter", [initialNumber]);

  return { simpleCounter };
});

export default SimpleCounterModule;
