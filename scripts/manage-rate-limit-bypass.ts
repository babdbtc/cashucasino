/**
 * Admin script to manage demo rate limit bypass accounts
 *
 * Usage:
 *   npx tsx scripts/manage-rate-limit-bypass.ts list
 *   npx tsx scripts/manage-rate-limit-bypass.ts add <account_id>
 *   npx tsx scripts/manage-rate-limit-bypass.ts remove <account_id>
 *   npx tsx scripts/manage-rate-limit-bypass.ts check <account_id>
 */

import {
  addDemoBypassAccount,
  removeDemoBypassAccount,
  hasDemoBypass,
  getDemoBypassAccounts,
} from "../lib/rate-limiter";

const command = process.argv[2];
const accountId = process.argv[3];

function showUsage() {
  console.log("\nUsage:");
  console.log("  npx tsx scripts/manage-rate-limit-bypass.ts list");
  console.log("  npx tsx scripts/manage-rate-limit-bypass.ts add <account_id>");
  console.log("  npx tsx scripts/manage-rate-limit-bypass.ts remove <account_id>");
  console.log("  npx tsx scripts/manage-rate-limit-bypass.ts check <account_id>");
  console.log("\nNote: This modifies the in-memory bypass list.");
  console.log("To persist changes, add account IDs directly to DEMO_BYPASS_ACCOUNTS in lib/rate-limiter.ts\n");
}

switch (command) {
  case "list": {
    const accounts = getDemoBypassAccounts();
    console.log("\n📋 Accounts with demo rate limit bypass:");
    if (accounts.length === 0) {
      console.log("  (none)");
    } else {
      accounts.forEach((acc) => console.log(`  - ${acc}`));
    }
    console.log();
    break;
  }

  case "add": {
    if (!accountId) {
      console.error("❌ Error: Account ID required");
      showUsage();
      process.exit(1);
    }
    addDemoBypassAccount(accountId);
    console.log(`✅ Added '${accountId}' to demo bypass list`);
    console.log("\n⚠️  Note: This change is in-memory only. To persist, add to DEMO_BYPASS_ACCOUNTS in lib/rate-limiter.ts");
    break;
  }

  case "remove": {
    if (!accountId) {
      console.error("❌ Error: Account ID required");
      showUsage();
      process.exit(1);
    }
    removeDemoBypassAccount(accountId);
    console.log(`✅ Removed '${accountId}' from demo bypass list`);
    break;
  }

  case "check": {
    if (!accountId) {
      console.error("❌ Error: Account ID required");
      showUsage();
      process.exit(1);
    }
    const hasBypass = hasDemoBypass(accountId);
    if (hasBypass) {
      console.log(`✅ Account '${accountId}' HAS demo bypass privileges`);
    } else {
      console.log(`❌ Account '${accountId}' does NOT have demo bypass privileges`);
    }
    break;
  }

  default: {
    console.error(`❌ Unknown command: ${command}`);
    showUsage();
    process.exit(1);
  }
}
