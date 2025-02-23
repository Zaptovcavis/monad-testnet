require("dotenv").config();
const ethers = require("ethers");
const colors = require("colors");
const displayHeader = require("../src/displayHeader.js");
const readline = require("readline");

displayHeader();

const RPC_URL = "https://testnet-rpc.monad.xyz/";
const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const contractAddress = "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7";
const gasLimitStake = 500000;
const gasLimitUnstake = 800000;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function getRandomAmount() {
  const min = 0.01;
  const max = 0.05;
  const randomAmount = Math.random() * (max - min) + min;
  return ethers.utils.parseEther(randomAmount.toFixed(4));
}

function getRandomDelay() {
  const minDelay = 1 * 60 * 1000;
  const maxDelay = 3 * 60 * 1000;
  return Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function stakeMON(cycleNumber) {
  try {
    console.log(`\n[Cycle ${cycleNumber}] Preparing to stake MON...`.magenta);

    const stakeAmount = getRandomAmount();
    console.log(
      `Random stake amount: ${ethers.utils.formatEther(stakeAmount)} MON`
    );

    const tx = {
      to: contractAddress,
      data: "0xd5575982",
      gasLimit: ethers.utils.hexlify(gasLimitStake),
      value: stakeAmount,
    };

    console.log("🔄 Sending stake transaction...");
    const txResponse = await wallet.sendTransaction(tx);
    console.log(
      `➡️  Transaction sent: ${EXPLORER_URL}${txResponse.hash}`.yellow
    );

    console.log("🔄 Waiting for transaction confirmation...");
    const receipt = await txResponse.wait();
    console.log(`✔️  Stake successful!`.green.underline);

    return { receipt, stakeAmount };
  } catch (error) {
    console.error("❌ Staking failed:".red, error.message);
    throw error;
  }
}

async function unstakeGMON(amountToUnstake, cycleNumber) {
  try {
    console.log(
      `\n[Cycle ${cycleNumber}] Preparing to unstake gMON...`.magenta
    );
    console.log(
      `Amount to unstake: ${ethers.utils.formatEther(amountToUnstake)} gMON`
    );

    const functionSelector = "0x6fed1ea7";
    const paddedAmount = ethers.utils.hexZeroPad(
      amountToUnstake.toHexString(),
      32
    );
    const data = functionSelector + paddedAmount.slice(2);

    const tx = {
      to: contractAddress,
      data: data,
      gasLimit: ethers.utils.hexlify(gasLimitUnstake),
    };

    console.log("🔄 Sending unstake transaction...");
    const txResponse = await wallet.sendTransaction(tx);
    console.log(
      `➡️  Transaction sent ${EXPLORER_URL}${txResponse.hash}`.yellow
    );

    console.log("🔄 Waiting for transaction confirmation...");
    const receipt = await txResponse.wait();
    console.log(`✔️  Unstake successful!`.green.underline);

    return receipt;
  } catch (error) {
    console.error("❌ Unstaking failed:".red, error.message);
    console.error("Full error:", JSON.stringify(error, null, 2));
    throw error;
  }
}

async function runCycle(cycleNumber) {
  try {
    console.log(`\n=== Starting Cycle ${cycleNumber} ===`.magenta.bold);

    const { stakeAmount } = await stakeMON(cycleNumber);

    const delayTime = getRandomDelay();
    console.log(`Waiting for ${delayTime / 1000} seconds before unstaking...`);
    await delay(delayTime);

    await unstakeGMON(stakeAmount, cycleNumber);

    console.log(
      `=== Cycle ${cycleNumber} completed successfully! ===`.magenta.bold
    );
  } catch (error) {
    console.error(`❌ Cycle ${cycleNumber} failed:`.red, error.message);
    throw error;
  }
}

function getCycleCount() {
  return new Promise((resolve) => {
    rl.question("How many staking cycles would you like to run? ", (answer) => {
      const cycleCount = parseInt(answer);
      if (isNaN(cycleCount) || cycleCount <= 0) {
        console.error("Please enter a valid positive number!".red);
        rl.close();
        process.exit(1);
      }
      resolve(cycleCount);
    });
  });
}

async function main() {
  try {
    console.log("Starting Magma Staking operations...".green);

    const cycleCount = await getCycleCount();
    console.log(`Running ${cycleCount} cycles...`.yellow);

    for (let i = 1; i <= cycleCount; i++) {
      await runCycle(i);

      if (i < cycleCount) {
        const interCycleDelay = getRandomDelay();
        console.log(
          `\nWaiting ${interCycleDelay / 1000} seconds before next cycle...`
        );
        await delay(interCycleDelay);
      }
    }

    console.log(
      `\nAll ${cycleCount} cycles completed successfully!`.green.bold
    );
  } catch (error) {
    console.error("Operation failed:".red, error.message);
  } finally {
    rl.close();
  }
}

main();

module.exports = {
  stakeMON,
  unstakeGMON,
  getRandomAmount,
  getRandomDelay,
};
