import { ethers } from "ethers";
import { contractAddress } from "./utils";
import { SimpleCounter__factory } from "../../standalone/simple-counter/typechain-types";

import dotenv from "dotenv";
dotenv.config();

const main = () => {
  const infuraWsUrl = `wss://polygon-amoy.infura.io/ws/v3/${process.env.INFURA_KEY}`;

  const provider = new ethers.WebSocketProvider(infuraWsUrl);
  const contract = SimpleCounter__factory.connect(contractAddress, provider);

  try {
    contract.on(contract.filters["NumberIncremented"], (updatedNumber) => {
      console.log(2222, updatedNumber);
    });

    console.log("Event: NumberIncremented Listening,,,");
  } catch (error) {
    console.log("Event: NumberIncremented Listener setup failure");
  }

  try {
    contract.on(contract.filters["NumberDecremented"], (updatedNumber) => {
      console.log(2222, updatedNumber);
    });

    console.log("Event: NumberDecremented Listening,,,");
  } catch (error) {
    console.log("Event: NumberDecremented Listener setup failure");
  }
};

main();
