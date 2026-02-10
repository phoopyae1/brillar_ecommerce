#!/bin/bash

echo "🔧 Fixing PREPARING_TO_SHIP and READY_TO_SHIP status support..."
echo ""

# Step 1: Run migrations
echo "1️⃣ Running database migrations..."
cd "$(dirname "$0")"
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "⚠️ Migration deploy failed. Trying dev migration..."
    npx prisma migrate dev --name add_shipping_statuses
fi

# Step 2: Generate Prisma client
echo ""
echo "2️⃣ Regenerating Prisma client..."
npx prisma generate

echo ""
echo "✅ Setup complete! Please restart your backend server."
echo ""
echo "The following statuses should now be available:"
echo "  - PREPARING_TO_SHIP"
echo "  - READY_TO_SHIP"
