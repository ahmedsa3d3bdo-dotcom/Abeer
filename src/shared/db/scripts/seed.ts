import { db } from "../index";
import * as schema from "../schema";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import {
  CATEGORIES_DATA,
  PRODUCTS_DATA,
  USERS_DATA,
  SHIPPING_METHODS_DATA,
  EMAIL_TEMPLATES_DATA,
  SYSTEM_SETTINGS_DATA,
  PERMISSIONS_DATA,
  STORIES_DATA,
} from "./seed-data";

dotenv.config();

async function seed() {
  console.log("🌱 Starting database seed...\n");

  try {
    // 1. Create Roles
    console.log("📝 Creating roles...");
    const [superAdminRole] = await db
      .insert(schema.roles)
      .values({
        name: "Super Admin",
        slug: "super_admin",
        description: "Full system access with all permissions",
        isSystem: true,
      })
      .onConflictDoUpdate({
        target: schema.roles.slug,
        set: {
          description: "Full system access with all permissions" as any,
          isSystem: true as any,
          updatedAt: new Date() as any,
        },
      })
      .returning({ id: schema.roles.id });

    const [adminRole] = await db
      .insert(schema.roles)
      .values({
        name: "Admin",
        slug: "admin",
        description: "Administrative access to manage the platform",
        isSystem: true,
      })
      .onConflictDoUpdate({
        target: schema.roles.slug,
        set: {
          description: "Administrative access to manage the platform" as any,
          isSystem: true as any,
          updatedAt: new Date() as any,
        },
      })
      .returning({ id: schema.roles.id });

    const [userRole] = await db
      .insert(schema.roles)
      .values({
        name: "User",
        slug: "user",
        description: "Standard customer access",
        isSystem: true,
      })
      .onConflictDoUpdate({
        target: schema.roles.slug,
        set: {
          description: "Standard customer access" as any,
          isSystem: true as any,
          updatedAt: new Date() as any,
        },
      })
      .returning({ id: schema.roles.id });

    console.log("✅ Roles created\n");

    // 2. Create Permissions
    console.log("📝 Creating permissions...");
    const permissions = await db
      .insert(schema.permissions)
      .values(
        PERMISSIONS_DATA.map((p) => ({
          name: p.name,
          slug: p.slug,
          resource: p.resource,
          action: p.action,
        })),
      )
      .returning({ id: schema.permissions.id, resource: schema.permissions.resource, action: schema.permissions.action });

    console.log(`✅ Created ${permissions.length} permissions\n`);

    // 3. Assign all permissions to super admin
    console.log("📝 Assigning permissions to roles...");
    await db.insert(schema.rolePermissions).values(
      permissions.map((perm) => ({
        roleId: superAdminRole.id,
        permissionId: perm.id,
      })),
    );

    // Assign limited permissions to admin
    const adminPerms = permissions.filter(
      (p) =>
        p.resource !== "settings" ||
        (p.resource === "settings" && p.action === "view"),
    );
    await db.insert(schema.rolePermissions).values(
      adminPerms.map((perm) => ({
        roleId: adminRole.id,
        permissionId: perm.id,
      })),
    );

    console.log("✅ Permissions assigned\n");

    // 4. Create Users
    console.log("📝 Creating users...");
    const users: Array<{ id: string; email: string }> = [];
    for (const userData of USERS_DATA) {
      const hashedPassword = bcrypt.hashSync(userData.password, 10);
      const [user] = await db
        .insert(schema.users)
        .values({
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        })
        .returning({ id: schema.users.id, email: schema.users.email });

      // Assign role
      const role =
        userData.role === "super_admin"
          ? superAdminRole
          : userData.role === "admin"
            ? adminRole
            : userRole;
      await db.insert(schema.userRoles).values({
        userId: user.id,
        roleId: role.id,
      });

      users.push(user);
    }
    console.log(`✅ Created ${users.length} users\n`);

    // 5. Create Categories
    console.log("📝 Creating categories...");
    const categoryMap = new Map<string, string>();
    for (const catData of CATEGORIES_DATA) {
      const parentId = catData.parent
        ? categoryMap.get(catData.parent)
        : null;
      const [category] = await db
        .insert(schema.categories)
        .values({
          name: catData.name,
          slug: catData.slug,
          description: catData.description,
          parentId,
          sortOrder: catData.sortOrder,
          isActive: true,
        })
        .returning({ id: schema.categories.id });

      categoryMap.set(catData.name, category.id);
    }
    console.log(`✅ Created ${categoryMap.size} categories\n`);

    // 6. Create Products
    console.log("📝 Creating products...");
    const productsList: Array<{ id: string; price: string; name: string; sku: string | null }> = [];
    for (const prodData of PRODUCTS_DATA) {
      const [product] = await db
        .insert(schema.products)
        .values({
          name: prodData.name,
          slug: prodData.slug,
          sku: prodData.sku,
          price: prodData.price,
          compareAtPrice: prodData.compareAtPrice || null,
          description: prodData.description,
          status: "active",
          stockStatus: "in_stock",
          isFeatured: prodData.isFeatured || false,
          trackInventory: true,
          allowReviews: true,
          createdBy: users[0].id,
          publishedAt: new Date(),
        })
        .returning({ id: schema.products.id, price: schema.products.price, name: schema.products.name, sku: schema.products.sku });

      // Link to category
      const categoryId = categoryMap.get(prodData.category);
      if (categoryId) {
        await db.insert(schema.productCategories).values({
          productId: product.id,
          categoryId,
        });
      }

      // Create inventory
      await db.insert(schema.inventory).values({
        productId: product.id,
        quantity: Math.floor(Math.random() * 100) + 20,
        reservedQuantity: 0,
        availableQuantity: Math.floor(Math.random() * 100) + 20,
        lowStockThreshold: 5,
      });

      productsList.push(product);
    }
    console.log(`✅ Created ${productsList.length} products\n`);

    // 7. Create Orders (realistic 2025 data: Jan-Nov)
    console.log("📝 Creating orders...");
    const orderStatuses = [
      "delivered",
      "delivered",
      "delivered",
      "shipped",
      "processing",
    ];
    const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Jan-Nov

    let orderCount = 0;
    for (const month of months) {
      const ordersThisMonth = Math.floor(Math.random() * 15) + 10;
      for (let i = 0; i < ordersThisMonth; i++) {
        const customer = users[Math.floor(Math.random() * (users.length - 3)) + 3];
        const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
        const orderDate = new Date(2025, month, Math.floor(Math.random() * 28) + 1);

        const yy = String(orderDate.getFullYear()).slice(-2);
        const mm = String(orderDate.getMonth() + 1).padStart(2, "0");
        const seq = String(orderCount + 1).padStart(6, "0");

        const [order] = await db
          .insert(schema.orders)
          .values({
            orderNumber: `ORD-${yy}-${mm}-${seq}`,
            userId: customer.id,
            status: status as any,
            paymentStatus: status === "delivered" ? "paid" : status === "cancelled" ? "refunded" : "paid",
            paymentMethod: ["credit_card", "paypal", "stripe"][Math.floor(Math.random() * 3)] as any,
            subtotal: "0",
            taxAmount: "0",
            shippingAmount: "5.99",
            discountAmount: "0",
            totalAmount: "0",
            customerEmail: customer.email,
            createdAt: orderDate,
            confirmedAt: status !== "pending" ? orderDate : null,
            shippedAt:
              status === "shipped" || status === "delivered"
                ? new Date(orderDate.getTime() + 86400000)
                : null,
            deliveredAt:
              status === "delivered"
                ? new Date(orderDate.getTime() + 259200000)
                : null,
          })
          .returning({ id: schema.orders.id });

        // Add 1-3 items per order
        const itemCount = Math.floor(Math.random() * 3) + 1;
        let subtotal = 0;
        for (let j = 0; j < itemCount; j++) {
          const product =
            productsList[Math.floor(Math.random() * productsList.length)];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const price = parseFloat(product.price || "0");
          const total = price * quantity;
          subtotal += total;

          await db.insert(schema.orderItems).values({
            orderId: order.id,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity,
            unitPrice: product.price!,
            totalPrice: total.toFixed(2),
          });
        }

        // Update order totals
        const tax = subtotal * 0.08;
        const total = subtotal + tax + 5.99;
        await db
          .update(schema.orders)
          .set({
            subtotal: subtotal.toFixed(2),
            taxAmount: tax.toFixed(2),
            totalAmount: total.toFixed(2),
          })
          .where(eq(schema.orders.id, order.id));

        orderCount++;
      }
    }
    console.log(`✅ Created ${orderCount} orders\n`);

    // 8. Create Shipping Methods
    console.log("📝 Creating shipping methods...");
    await db.insert(schema.shippingMethods).values(SHIPPING_METHODS_DATA);
    console.log(`✅ Created ${SHIPPING_METHODS_DATA.length} shipping methods\n`);

    // 9. Create Email Templates
    console.log("📝 Creating email templates...");
    await db.insert(schema.emailTemplates).values(EMAIL_TEMPLATES_DATA);
    console.log(`✅ Created ${EMAIL_TEMPLATES_DATA.length} email templates\n`);

    // 10. Create System Settings
    console.log("📝 Creating system settings...");
    await db.insert(schema.systemSettings).values(SYSTEM_SETTINGS_DATA);
    console.log(`✅ Created ${SYSTEM_SETTINGS_DATA.length} system settings\n`);

    // 11. Create Stories
    console.log("📝 Creating stories...");
    for (const storyData of STORIES_DATA) {
      await db.insert(schema.stories).values({
        title: storyData.title,
        slug: storyData.slug,
        excerpt: storyData.excerpt,
        content: storyData.content,
        status: "published",
        authorId: users[0].id,
        publishedAt: new Date(),
      });
    }
    console.log(`✅ Created ${STORIES_DATA.length} stories\n`);

    // 12. Create some product reviews
    console.log("📝 Creating product reviews...");
    const reviewCount = 25;
    for (let i = 0; i < reviewCount; i++) {
      const product =
        productsList[Math.floor(Math.random() * productsList.length)];
      const customer =
        users[Math.floor(Math.random() * (users.length - 3)) + 3];

      await db.insert(schema.productReviews).values({
        productId: product.id,
        userId: customer.id,
        rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
        title: "Great product!",
        content: "I really enjoyed this product. Highly recommended!",
        isVerifiedPurchase: Math.random() > 0.3,
        isApproved: true,
        approvedBy: users[0].id,
        approvedAt: new Date(),
      });
    }
    console.log(`✅ Created ${reviewCount} reviews\n`);

    console.log("✅ Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Categories: ${categoryMap.size}`);
    console.log(`   - Products: ${productsList.length}`);
    console.log(`   - Orders: ${orderCount}`);
    console.log(`   - Reviews: ${reviewCount}`);
    console.log("\n🔑 Login Credentials:");
    console.log("   Super Admin: admin@abeershop.com");
    console.log("   Admin: john.manager@abeershop.com");
    console.log("   User: mike.johnson@gmail.com");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("\n✅ Seed complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  });
