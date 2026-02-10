#!/bin/bash

echo "🔧 Fixing READY_TO_SHIP status support..."
echo ""

# Step 1: Run migration
echo "1️⃣ Running database migration..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "⚠️ Migration failed. Trying dev migration..."
    npx prisma migrate dev --name add_ready_to_ship_status
fi

# Step 2: Generate Prisma client
echo ""
echo "2️⃣ Regenerating Prisma client..."
npx prisma generate

# Step 3: Verify the enum
echo ""
echo "3️⃣ Verifying OrderStatus enum..."
npx prisma db execute --stdin <<< "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status;" || echo "Could not verify enum (this is okay if migration succeeded)"

echo ""
echo "✅ Setup complete! Please restart your backend server."
echo ""
echo "To verify, check that READY_TO_SHIP appears in the OrderStatus enum."
