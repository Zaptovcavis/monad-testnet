require("dotenv").config();
const ethers = require("ethers");
const colors = require("colors");
const displayHeader = require("../src/displayHeader.js");
const readline = require("readline");
const axios = require("axios");

displayHeader();

const RPC_URL = "https://testnet-rpc.monad.xyz/";
const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const contractAddress = "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A";
const gasLimitStake = 500000;
const gasLimitUnstake = 800000;
const gasLimitClaim = 800000;

const minimalABI = [
  "function getPendingUnstakeRequests(address) view returns (uint256[] memory)",
];

const contract = new ethers.Contract(contractAddress, minimalABI, provider);

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

    const data =
      "0x6e553f65" +
      ethers.utils.hexZeroPad(stakeAmount.toHexString(), 32).slice(2) +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2);

    const tx = {
      to: contractAddress,
      data: data,
      gasLimit: ethers.utils.hexlify(gasLimitStake),
      value: stakeAmount,
    };

    console.log("🔄 Sending stake transaction...");
    const txResponse = await wallet.sendTransaction(tx);
    console.log(
      `➡️  Transaction sent: ${EXPLORER_URL}${txResponse.hash}`.yellow
    );

    console.log("Waiting for transaction confirmation...");
    const receipt = await txResponse.wait();
    console.log(`✔️  Stake successful!`.green.underline);

    return { receipt, stakeAmount };
  } catch (error) {
    console.error("❌ Staking failed:".red, error.message);
    throw error;
  }
}

async function requestUnstakeAprMON(amountToUnstake, cycleNumber) {
  try {
    console.log(
      `\n[Cycle ${cycleNumber}] Preparing to request unstake aprMON...`.magenta
    );
    console.log(
      `Amount to request unstake: ${ethers.utils.formatEther(
        amountToUnstake
      )} aprMON`
    );

    const data =
      "0x7d41c86e" +
      ethers.utils.hexZeroPad(amountToUnstake.toHexString(), 32).slice(2) +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2) +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2);

    const tx = {
      to: contractAddress,
      data: data,
      gasLimit: ethers.utils.hexlify(gasLimitUnstake),
      value: ethers.utils.parseEther("0"),
    };

    console.log("🔄 Sending unstake request transaction...");
    const txResponse = await wallet.sendTransaction(tx);
    console.log(
      `➡️  Transaction sent: ${EXPLORER_URL}${txResponse.hash}`.yellow
    );

    console.log("🔄 Waiting for transaction confirmation...");
    const receipt = await txResponse.wait();
    console.log(`✔️  Unstake request successful!`.green.underline);

    return receipt;
  } catch (error) {
    console.error("❌ Unstake request failed:".red, error.message);
    throw error;
  }
}

async function checkClaimableStatus(walletAddress) {
  try {
    const apiUrl = `https://liquid-staking-backend-prod-b332fbe9ccfe.herokuapp.com/withdrawal_requests?address=${walletAddress}`;
    const response = await axios.get(apiUrl);

    const claimableRequest = response.data.find(
      (request) => !request.claimed && request.is_claimable
    );

    if (claimableRequest) {
      console.log(`Found claimable request ID: ${claimableRequest.id}`);
      return {
        id: claimableRequest.id,
        isClaimable: true,
      };
    }
    return {
      id: null,
      isClaimable: false,
    };
  } catch (error) {
    console.error(
      "❌ Failed to check claimable status from API:".red,
      error.message
    );
    return {
      id: null,
      isClaimable: false,
    };
  }
}

async function claimMON(cycleNumber) {
  try {
    console.log(`\n[Cycle ${cycleNumber}] Checking claimable withdrawals...`);

    const { id, isClaimable } = await checkClaimableStatus(wallet.address);

    if (!isClaimable || !id) {
      console.log("No claimable withdrawals found at this time");
      return null;
    }

    console.log(`Preparing to claim withdrawal request ID: ${id}`);

    const data =
      "0x492e47d2" +
      "0000000000000000000000000000000000000000000000000000000000000040" +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2) +
      "0000000000000000000000000000000000000000000000000000000000000001" +
      ethers.utils
        .hexZeroPad(ethers.BigNumber.from(id).toHexString(), 32)
        .slice(2);

    const tx = {
      to: contractAddress,
      data: data,
      gasLimit: ethers.utils.hexlify(gasLimitClaim),
      value: ethers.utils.parseEther("0"),
    };

    console.log("Sending claim transaction...");
    const txResponse = await wallet.sendTransaction(tx);
    console.log(`Transaction sent: ${EXPLORER_URL}${txResponse.hash}`);

    console.log("Waiting for transaction confirmation...");
    const receipt = await txResponse.wait();
    console.log(`Claim successful for request ID: ${id}`.green.underline);

    return receipt;
  } catch (error) {
    console.error("Claim failed:", error.message);
    throw error;
  }
}

async function runCycle(cycleNumber) {
  try {
    console.log(`\n=== Starting Cycle ${cycleNumber} ===`);

    const { stakeAmount } = await stakeMON(cycleNumber);

    const delayTimeBeforeUnstake = getRandomDelay();
    console.log(
      `🔄 Waiting for ${
        delayTimeBeforeUnstake / 1000
      } seconds before requesting unstake...`
    );
    await delay(delayTimeBeforeUnstake);

    await requestUnstakeAprMON(stakeAmount, cycleNumber);

    console.log(
      `Waiting for 660 seconds (11 minutes) before checking claim status...`
        .magenta
    );
    await delay(660000);

    await claimMON(cycleNumber);

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
    console.log("Starting aPriori Staking operations...".green);

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
  requestUnstakeAprMON,
  claimMON,
  getRandomAmount,
  getRandomDelay,
};
