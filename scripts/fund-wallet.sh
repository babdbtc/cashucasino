#!/bin/bash

# Script to fund the house wallet
# Usage: ./scripts/fund-wallet.sh <cashu-token>

if [ -z "$1" ]; then
  echo "Usage: ./scripts/fund-wallet.sh <cashu-token>"
  echo ""
  echo "Example:"
  echo "  ./scripts/fund-wallet.sh 'cashuAeyJ0b2tlbiI6W3...'"
  exit 1
fi

TOKEN="$1"

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep ADMIN_API_KEY | xargs)
fi

if [ -z "$ADMIN_API_KEY" ]; then
  echo "Error: ADMIN_API_KEY not set in .env.local"
  exit 1
fi

# Check if running locally or on server
if [ "$2" == "local" ]; then
  API_URL="http://localhost:3000"
else
  API_URL="https://gamble.babd.space"
fi

echo "Funding house wallet..."
echo ""

response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -d "{\"token\": \"$TOKEN\"}" \
  "$API_URL/api/admin/wallet")

if [ $? -eq 0 ]; then
  echo "$response" | jq '.'
  echo ""
  echo "✅ Wallet funded successfully!"
else
  echo "❌ Error: Failed to fund wallet"
  exit 1
fi
