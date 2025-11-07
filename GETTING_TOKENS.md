# Getting Cashu Tokens for Testing

To play on Gamble BABD, you need Cashu tokens from `mint.minibits.cash`. Here's how to get them:

## Option 1: Minibits Wallet (Recommended)

1. **Download Minibits Wallet**
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=com.minibits)
   - iOS: [App Store](https://apps.apple.com/app/minibits/id6450749076)
   - Or use the web version at [wallet.minibits.cash](https://wallet.minibits.cash)

2. **Fund Your Wallet**
   - Send Bitcoin to your Minibits Lightning address
   - Or receive from another Lightning wallet
   - Or use the faucet feature if available

3. **Create Cashu Token**
   - In Minibits, go to "Send"
   - Select "Send as Cashu token"
   - Enter the amount (e.g., 100 sats)
   - Select the mint: `mint.minibits.cash`
   - Generate the token
   - Copy the token string (it will look like: `cashuA...`)

4. **Use the Token**
   - Paste the token into the game interface
   - Select your bet amount
   - Play!

## Option 2: Command Line (Advanced)

If you want to test using the Cashu CLI:

```bash
# Install Cashu CLI
pip install cashu

# Set the mint
export MINT_URL=https://mint.minibits.cash/Bitcoin

# Generate a token (you'll need to fund it first)
cashu send 100

# This will output a token string you can use
```

## Option 3: Other Cashu Wallets

Other wallets that support Cashu and can work with custom mints:
- **Nutsack**: Terminal-based Cashu wallet
- **eNuts**: Mobile Cashu wallet (iOS/Android)
- **Cashu.me**: Web-based wallet

Make sure to configure them to use `mint.minibits.cash` as the mint.

## Token Format

A valid Cashu token looks like this:

```
cashuAeyJ0b2tlbiI6W3sicHJvb2ZzIjpbeyJpZCI6IjAwYWQyNjhkYjc5OCIsImFtb3VudCI6Miwic2VjcmV0IjoiMzNmOGY0YzFkNGRkNGNhNmJmODJlYTBiMWI4YzI5NTEiLCJDIjoiMDM5NDI5ZjU5ZTI2NzI4ZjQwZDY3OTJiNDk5OTkxNTIzNjc1NGI2YzhmMmYxNWJjZTdmZjgwNTJjYWRlZTNmNzRhIn1dLCJtaW50IjoiaHR0cHM6Ly84MzMzLnNwYWNlOjMzMzgifV19
```

## Important Notes

1. **Token Amount**: Your token must contain at least the amount you want to bet
2. **Single Use**: Each token can only be used once (no double-spending)
3. **Immediate Consumption**: The token is redeemed immediately when you play
4. **Winnings**: If you win, you'll receive a new token with your winnings
5. **No Refunds**: Once a token is used, it cannot be refunded

## Testing Tips

For testing purposes, start with small amounts:
- **Small bets**: 1-10 sats for testing
- **Test token**: Create a token with 50-100 sats
- **Try different bet sizes**: Test with min bet (1 sat) and higher amounts

## Troubleshooting

### "Invalid token" error
- Make sure you copied the entire token string
- Verify the token is from mint.minibits.cash
- Token might already be spent - generate a new one

### "Insufficient token amount" error
- Your token has less sats than your bet
- Generate a new token with more sats

### "Token already spent" error
- This token was already used
- Generate a fresh token

## Security

- **Never share your tokens publicly** - they're like cash
- **Don't reuse tokens** - they can only be spent once
- **Keep your wallet secure** - treat it like real money
- **Test with small amounts first**

## Need Help?

- Check the [Cashu documentation](https://docs.cashu.space/)
- Visit [Minibits documentation](https://github.com/minibits-cash/minibits_wallet)
- Join the [Cashu Telegram group](https://t.me/CashuBTC)

---

**Remember**: These are real Bitcoin-backed tokens. Start small and play responsibly!
