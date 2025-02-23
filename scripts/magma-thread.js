const ethers = require('ethers');
const colors = require('colors');
const fs = require('fs');
const displayHeader = require('../src/displayHeader.js');
const readline = require('readline');
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require('worker_threads');

displayHeader();

// Konfigurasi tetap (bukan dari .env)
const RPC_URL = 'https://testnet-rpc.monad.xyz/';
const EXPLORER_URL = 'https://testnet.monadexplorer.com/tx/';
const contractAddress = '0x2c9C959516e9AAEdB2C748224a41249202ca8BE7';
const gasLimitStake = 500000;
const gasLimitUnstake = 800000;

// Membaca daftar private key dari file wallet.txt
const wallets = fs
  .readFileSync('wallet.txt', 'utf8')
  .split('\n')
  .filter(Boolean);

// Membaca daftar proxy dari file proxy.txt
const proxies = fs
  .readFileSync('proxy.txt', 'utf8')
  .split('\n')
  .filter(Boolean);

if (wallets.length === 0 || proxies.length === 0) {
  console.error('Please ensure wallet.txt and proxy.txt are not empty.'.red);
  process.exit(1);
}

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

async function stakeMON(wallet, cycleNumber) {
  try {
    console.log(`\n[Cycle ${cycleNumber}] Preparing to stake MON...`.magenta);
    const stakeAmount = getRandomAmount();
    console.log(
      `Random stake amount: ${ethers.utils.formatEther(stakeAmount)} MON`
    );
    const tx = {
      to: contractAddress,
      data: '0xd5575982',
      gasLimit: ethers.utils.hexlify(gasLimitStake),
      value: stakeAmount,
    };
    console.log('🔄 Sending stake transaction...');
    const txResponse = await wallet.sendTransaction(tx);
    console.log(
      `➡️  Transaction sent: ${EXPLORER_URL}${txResponse.hash}`.yellow
    );
    console.log('🔄 Waiting for transaction confirmation...');
    const receipt = await txResponse.wait();
    console.log(`✔️  Stake successful!`.green.underline);
    return { receipt, stakeAmount };
  } catch (error) {
    console.error('❌ Staking failed:'.red, error.message);
    throw error;
  }
}

async function unstakeGMON(wallet, amountToUnstake, cycleNumber) {
  try {
    console.log(
      `\n[Cycle ${cycleNumber}] Preparing to unstake gMON...`.magenta
    );
    console.log(
      `Amount to unstake: ${ethers.utils.formatEther(amountToUnstake)} gMON`
    );
    const functionSelector = '0x6fed1ea7';
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
    console.log('🔄 Sending unstake transaction...');
    const txResponse = await wallet.sendTransaction(tx);
    console.log(
      `➡️  Transaction sent ${EXPLORER_URL}${txResponse.hash}`.yellow
    );
    console.log('🔄 Waiting for transaction confirmation...');
    const receipt = await txResponse.wait();
    console.log(`✔️  Unstake successful!`.green.underline);
    return receipt;
  } catch (error) {
    console.error('❌ Unstaking failed:'.red, error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    throw error;
  }
}

async function runCycle(wallet, cycleNumber) {
  try {
    console.log(`\n=== Starting Cycle ${cycleNumber} ===`.magenta.bold);
    const { stakeAmount } = await stakeMON(wallet, cycleNumber);
    const delayTime = getRandomDelay();
    console.log(`Waiting for ${delayTime / 1000} seconds before unstaking...`);
    await delay(delayTime);
    await unstakeGMON(wallet, stakeAmount, cycleNumber);
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
    rl.question('How many staking cycles would you like to run? ', (answer) => {
      const cycleCount = parseInt(answer);
      if (isNaN(cycleCount) || cycleCount <= 0) {
        console.error('Please enter a valid positive number!'.red);
        rl.close();
        process.exit(1);
      }
      resolve(cycleCount);
    });
  });
}

if (isMainThread) {
  // Main thread logic
  async function main() {
    try {
      console.log('Starting Magma Staking operations...'.green);
      const cycleCount = await getCycleCount();
      console.log(`Running ${cycleCount} cycles...`.yellow);

      const workers = [];
      for (let i = 0; i < wallets.length; i++) {
        const privateKey = wallets[i].trim();
        const proxy = proxies[i % proxies.length].trim();

        // Create a worker for each account
        const worker = new Worker(__filename, {
          workerData: { privateKey, proxy, cycleCount },
        });

        workers.push(worker);

        worker.on('message', (message) => {
          console.log(message);
        });

        worker.on('error', (error) => {
          console.error(`Worker error: ${error.message}`.red);
        });

        worker.on('exit', (code) => {
          if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`.red);
          }
        });
      }

      // Wait for all workers to finish
      await Promise.all(workers.map((worker) => worker.terminate()));
      console.log(
        `\nAll ${cycleCount} cycles completed successfully for all accounts!`
          .green.bold
      );
    } catch (error) {
      console.error('Operation failed:'.red, error.message);
    } finally {
      rl.close();
    }
  }

  main();
} else {
  // Worker thread logic
  const { privateKey, proxy, cycleCount } = workerData;

  const provider = new ethers.providers.JsonRpcProvider({
    url: RPC_URL,
    headers: {
      'Proxy-Authorization': `Basic ${Buffer.from(proxy.split('@')[0]).toString(
        'base64'
      )}`,
    },
  });

  const wallet = new ethers.Wallet(privateKey, provider);

  parentPort.postMessage(
    `\nStarting operations for account ${wallet.address} using proxy ${proxy}`
      .cyan
  );

  (async () => {
    for (let j = 1; j <= cycleCount; j++) {
      await runCycle(wallet, j);
      if (j < cycleCount) {
        const interCycleDelay = getRandomDelay();
        parentPort.postMessage(
          `\nWaiting ${interCycleDelay / 1000} seconds before next cycle...`
        );
        await delay(interCycleDelay);
      }
    }
    parentPort.postMessage(
      `\nAll ${cycleCount} cycles completed successfully for account ${wallet.address}!`
        .green.bold
    );
  })();
}
