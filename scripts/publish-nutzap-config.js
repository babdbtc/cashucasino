/**
 * Publish NIP-61 Nutzap Configuration (kind 10019)
 *
 * This script publishes your nutzap configuration to Nostr relays.
 * You need to provide your Nostr private key (nsec or hex format).
 */

const { SimplePool, nip19, finalizeEvent, generateSecretKey, getPublicKey } = require('nostr-tools');

// Configuration - EDIT THESE VALUES
const CONFIG = {
  // Your Nostr private key (nsec format or hex)
  privateKey: 'YOUR_NSEC_OR_HEX_PRIVATE_KEY_HERE',

  // Relays to publish to and monitor for nutzaps
  relays: [
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://nos.lol',
  ],

  // Cashu mints you accept tokens from
  mints: [
    'https://mint.minibits.cash/Bitcoin',
    'https://testnut.cashu.space',
  ],

  // Your P2PK public key for receiving locked tokens
  // This should be a 33-byte compressed public key (66 hex chars starting with 02 or 03)
  // If you don't have one, the script will generate one from your Nostr key
  p2pkPubkey: '', // Leave empty to auto-generate from your Nostr key
};

async function publishNutzapConfig() {
  try {
    // Parse private key
    let privateKey;
    if (CONFIG.privateKey.startsWith('nsec')) {
      const decoded = nip19.decode(CONFIG.privateKey);
      privateKey = decoded.data;
    } else {
      // Assume hex format
      privateKey = CONFIG.privateKey;
    }

    // Get public key
    const publicKey = getPublicKey(privateKey);
    console.log(`Publishing nutzap config for pubkey: ${publicKey}`);

    // Generate P2PK pubkey if not provided
    let p2pkPubkey = CONFIG.p2pkPubkey;
    if (!p2pkPubkey) {
      // Use the same public key but ensure it has 02/03 prefix
      p2pkPubkey = '02' + publicKey;
      console.log(`Generated P2PK pubkey: ${p2pkPubkey}`);
    }

    // Ensure P2PK pubkey has correct prefix
    if (!p2pkPubkey.startsWith('02') && !p2pkPubkey.startsWith('03')) {
      p2pkPubkey = '02' + p2pkPubkey;
    }

    // Create kind 10019 event
    const event = {
      kind: 10019,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        // Add relay tags
        ...CONFIG.relays.map(relay => ['relay', relay]),
        // Add mint tags
        ...CONFIG.mints.map(mint => ['mint', mint]),
        // Add P2PK pubkey tag
        ['pubkey', p2pkPubkey],
      ],
      content: '',
    };

    // Sign the event
    const signedEvent = finalizeEvent(event, privateKey);

    console.log('\nSigned Event:');
    console.log(JSON.stringify(signedEvent, null, 2));

    // Publish to relays
    console.log('\nPublishing to relays...');
    const pool = new SimplePool();

    const publishPromises = CONFIG.relays.map(relay =>
      pool.publish([relay], signedEvent)
    );

    await Promise.all(publishPromises);

    console.log('\n✅ Successfully published nutzap configuration!');
    console.log(`\nYour nutzap config is now live at these relays:`);
    CONFIG.relays.forEach(relay => console.log(`  - ${relay}`));
    console.log(`\nAccepted mints:`);
    CONFIG.mints.forEach(mint => console.log(`  - ${mint}`));
    console.log(`\nP2PK pubkey: ${p2pkPubkey}`);

    // Wait a bit before closing
    await new Promise(resolve => setTimeout(resolve, 2000));
    pool.close(CONFIG.relays);

  } catch (error) {
    console.error('Error publishing nutzap config:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  if (CONFIG.privateKey === 'YOUR_NSEC_OR_HEX_PRIVATE_KEY_HERE') {
    console.error('❌ Error: Please edit the CONFIG section and add your private key!');
    console.log('\nSteps:');
    console.log('1. Open this file in an editor');
    console.log('2. Replace YOUR_NSEC_OR_HEX_PRIVATE_KEY_HERE with your actual nsec or hex private key');
    console.log('3. Optionally customize the relays and mints list');
    console.log('4. Run: node scripts/publish-nutzap-config.js');
    process.exit(1);
  }

  publishNutzapConfig();
}

module.exports = { publishNutzapConfig };
