# Monad Testnet AIO

Monad Testnet bot. Multi-thread, multi-account and proxy suppported.
## Installation

1. Clone the Repository

Clone this repository to your local machine using the following command:

```bash
git clone https://github.com/Zaptovcavis/monad-testnet.git
cd monad-testnet
```

2. Install the required dependencies:

   ```bash
   npm install
   ```

## Configuration
**For multi-thread mode:**

1.  **Add Private keys to `wallet.txt`**

2. **Add proxy to `proxy.txt`** file

**For single-thread mode:**

1.  **Rename `.env.example` to .env**
   ```bash
    cp .env.example .env
   ```

2. **Edit the `.env` file Replace your_evm_private_key with your actual EVM wallet private key**
   ```bash
    PRIVATE_KEY=0x1234...
   ```

## Usage

To run the bot, use the following command:

```bash
npm start
```

The bot will start processing each wallet based on the configured.

