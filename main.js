const prompts = require('prompts');
const displayHeader  = require('./src/displayHeader.js');
const { GetBanner } = require("./scripts/izumi-thread.js");
displayHeader();

const availableScripts = [
  { title: 'Rubic Swap Script', value: 'rubic' },
  { title: 'Magma Staking Script', value: 'magma' },
  { title: 'Izumi Swap Script', value: 'izumi' },
  { title: 'aPriori Staking Script', value: 'apriori' },
  { title: 'Multi Rubic Swap Script', value: 'rubic-multi' },
  { title: 'Multi Magma Staking Script', value: 'magma-multi' },
  { title: 'Multi Izumi Swap Script', value: 'izumi-multi' },
  { title: 'Multi aPriori Staking Script', value: 'apriori-multi' },
  { title: 'Exit', value: 'exit' },
];
GetBanner();
async function run() {
  const response = await prompts({
    type: 'select',
    name: 'script',
    message: 'Select the script to run:',
    choices: availableScripts,
  });

  const selectedScript = response.script;

  if (!selectedScript) {
    console.log('No script selected. Exiting...');
    return;
  }

  switch (selectedScript) {
    case 'rubic':
      console.log('Running Rubic Swap...');
      const rubic = require('./scripts/rubic');
      break;

    case 'magma':
      console.log('Running Magma Staking...');
      const magma = require('./scripts/magma');
      break;

    case 'izumi':
      console.log('Running Izumi Swap...');
      const izumi = require('./scripts/izumi');
      break;

    case 'apriori':
      console.log('Running aPriori Staking...');
      const monorail = require('./scripts/apriori');
      break;

    case 'rubic-multi':
      console.log('Running Multi Rubic Swap...');
      const rubicMulti = require('./scripts/rubic-multi');
      break;

    case 'magma-multi':
      console.log('Running Multi Magma Staking...');
      const magmaMulti = require('./scripts/magma-multi');
      break;

    case 'izumi-multi':
      console.log('Running Multi Izumi Swap...');
      const izumiMulti = require('./scripts/izumi-multi');
      break;

    case 'apriori-multi':
      console.log('Running Multi aPriori Staking...');
      const monorailMulti = require('./scripts/apriori-multi');
      break;

    case 'exit':
      console.log('Exiting bot...');
      process.exit(0);
      break;
  }
}

run().catch((error) => {
  console.error('Error occured:', error);
});
