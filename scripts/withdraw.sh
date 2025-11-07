#!/bin/bash

# Script to withdraw funds from house wallet
# Usage: ./scripts/withdraw.sh <amount-in-sats> [local]

if [ -z "$1" ]; then
  echo "Usage: ./scripts/withdraw.sh <amount-in-sats> [local]"
  echo ""
  echo "Example:"
  echo "  ./scripts/withdraw.sh 10000        # Withdraw 10k sats from production"
  echo "  ./scripts/withdraw.sh 5000 local   # Withdraw 5k sats from localhost"
  exit 1
fi

AMOUNT="$1"

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

echo "Withdrawing ${AMOUNT} sats from house wallet..."
echo ""

response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -d "{\"amount\": $AMOUNT}" \
  "$API_URL/api/admin/withdraw")

if [ $? -eq 0 ]; then
  # Pretty print the response
  echo "$response" | jq '.'

  # Extract and display the token
  token=$(echo "$response" | jq -r '.token')

  if [ "$token" != "null" ] && [ -n "$token" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ WITHDRAWAL SUCCESSFUL!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Your Cashu token:"
    echo "$token"
    echo ""
    echo "Copy this token and paste it into your Cashu wallet to receive the funds!"
    echo ""
  fi
else
  echo "❌ Error: Failed to withdraw funds"
  exit 1
fi
