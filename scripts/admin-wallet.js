/**
 * Admin Wallet Management Script
 *
 * Manage house wallet balances (demo and real) via admin API
 *
 * Usage:
 *   node scripts/admin-wallet.js check [demo|real]
 *   node scripts/admin-wallet.js fund <token> [demo|real]
 *   node scripts/admin-wallet.js withdraw <amount> [demo|real]
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'change-this-in-production';

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

async function checkBalance(mode = 'demo') {
  console.log(`\n📊 Checking ${mode.toUpperCase()} wallet balance...\n`);

  const data = await makeRequest(`/api/admin/wallet?mode=${mode}`);

  console.log(`Mode:         ${data.mode}`);
  console.log(`Balance:      ${data.balance} sats`);
  console.log(`Proof Count:  ${data.proofCount}`);
  console.log(`Last Updated: ${data.lastUpdated}`);
  console.log(`Status:       ${data.status}`);

  return data;
}

async function fundWallet(token, mode = 'demo') {
  console.log(`\n💰 Funding ${mode.toUpperCase()} wallet...\n`);

  const data = await makeRequest('/api/admin/wallet', {
    method: 'POST',
    body: JSON.stringify({ token, mode }),
  });

  console.log(`✅ ${data.message}`);
  console.log(`Mode:        ${data.mode}`);
  console.log(`Added:       ${data.added} sats`);
  console.log(`New Balance: ${data.newBalance} sats`);

  return data;
}

async function withdrawFunds(amount, mode = 'demo') {
  console.log(`\n💸 Withdrawing ${amount} sats from ${mode.toUpperCase()} wallet...\n`);

  const data = await makeRequest('/api/admin/withdraw', {
    method: 'POST',
    body: JSON.stringify({ amount, mode }),
  });

  console.log(`✅ ${data.message}`);
  console.log(`Mode:        ${data.mode}`);
  console.log(`Amount:      ${data.amount} sats`);
  console.log(`New Balance: ${data.newBalance} sats`);
  console.log(`\n🎟️  Cashu Token:\n${data.token}\n`);
  console.log(`Save this token to redeem the funds in your wallet!`);

  return data;
}

async function checkBothWallets() {
  console.log('\n═══════════════════════════════════════');
  console.log('    HOUSE WALLET BALANCES');
  console.log('═══════════════════════════════════════');

  try {
    const demo = await makeRequest('/api/admin/wallet?mode=demo');
    console.log('\n📊 DEMO Wallet:');
    console.log(`   Balance:      ${demo.balance} sats`);
    console.log(`   Proof Count:  ${demo.proofCount}`);
    console.log(`   Last Updated: ${demo.lastUpdated}`);
  } catch (error) {
    console.log('\n❌ DEMO Wallet: Error -', error.message);
  }

  try {
    const real = await makeRequest('/api/admin/wallet?mode=real');
    console.log('\n💎 REAL Wallet:');
    console.log(`   Balance:      ${real.balance} sats`);
    console.log(`   Proof Count:  ${real.proofCount}`);
    console.log(`   Last Updated: ${real.lastUpdated}`);
  } catch (error) {
    console.log('\n❌ REAL Wallet: Error -', error.message);
  }

  console.log('\n═══════════════════════════════════════\n');
}

// Main CLI handler
async function main() {
  const [,, command, ...args] = process.argv;

  try {
    switch (command) {
      case 'check':
      case 'balance': {
        const mode = args[0] || 'demo';
        if (mode !== 'demo' && mode !== 'real') {
          console.error('❌ Error: Mode must be "demo" or "real"');
          process.exit(1);
        }
        await checkBalance(mode);
        break;
      }

      case 'both':
      case 'all': {
        await checkBothWallets();
        break;
      }

      case 'fund':
      case 'deposit': {
        const token = args[0];
        const mode = args[1] || 'demo';

        if (!token) {
          console.error('❌ Error: Token required');
          console.log('Usage: node scripts/admin-wallet.js fund <token> [demo|real]');
          process.exit(1);
        }

        if (mode !== 'demo' && mode !== 'real') {
          console.error('❌ Error: Mode must be "demo" or "real"');
          process.exit(1);
        }

        await fundWallet(token, mode);
        break;
      }

      case 'withdraw': {
        const amount = parseInt(args[0]);
        const mode = args[1] || 'demo';

        if (!amount || amount <= 0) {
          console.error('❌ Error: Valid amount required');
          console.log('Usage: node scripts/admin-wallet.js withdraw <amount> [demo|real]');
          process.exit(1);
        }

        if (mode !== 'demo' && mode !== 'real') {
          console.error('❌ Error: Mode must be "demo" or "real"');
          process.exit(1);
        }

        await withdrawFunds(amount, mode);
        break;
      }

      default: {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Casino House Wallet Admin Tool                    ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  node scripts/admin-wallet.js <command> [args]

Commands:
  check [mode]              Check balance for demo or real wallet
  both                      Check both demo and real wallet balances
  fund <token> [mode]       Fund wallet with Cashu token
  withdraw <amount> [mode]  Withdraw funds from wallet

Arguments:
  mode                      "demo" or "real" (default: demo)
  token                     Cashu token string (cashuA...)
  amount                    Amount in sats (number)

Examples:
  node scripts/admin-wallet.js both
  node scripts/admin-wallet.js check real
  node scripts/admin-wallet.js fund cashuAey... demo
  node scripts/admin-wallet.js withdraw 1000 real

Environment Variables:
  API_BASE_URL              API base URL (default: http://localhost:3000)
  ADMIN_API_KEY             Admin API key (default: change-this-in-production)

Set ADMIN_API_KEY in .env.local file or export it:
  export ADMIN_API_KEY=your-secret-key
        `);
        process.exit(command ? 1 : 0);
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('fetch')) {
      console.error('\nMake sure the server is running and API_BASE_URL is correct.');
    }
    if (error.message.includes('Unauthorized')) {
      console.error('\nCheck that ADMIN_API_KEY is set correctly.');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkBalance, fundWallet, withdrawFunds, checkBothWallets };
