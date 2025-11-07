#!/bin/bash

# Simple script to check house wallet balance
# Usage: ./scripts/check-wallet.sh

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep ADMIN_API_KEY | xargs)
fi

if [ -z "$ADMIN_API_KEY" ]; then
  echo "Error: ADMIN_API_KEY not set in .env.local"
  exit 1
fi

# Check if running locally or on server
if [ "$1" == "local" ]; then
  API_URL="http://localhost:3000"
else
  API_URL="https://gamble.babd.space"
fi

echo "Checking house wallet balance..."
echo ""

response=$(curl -s -H "Authorization: Bearer $ADMIN_API_KEY" "$API_URL/api/admin/wallet")

if [ $? -eq 0 ]; then
  echo "$response" | jq '.'
else
  echo "Error: Failed to connect to API"
  exit 1
fi
