// Seed data constants for the e-commerce platform (Jan - Nov 2025)

export const CATEGORIES_DATA = [
  { name: "Electronics", slug: "electronics", description: "Electronic devices and accessories", sortOrder: 1 },
  { name: "Smartphones", slug: "smartphones", description: "Mobile phones and accessories", parent: "Electronics", sortOrder: 1 },
  { name: "Laptops", slug: "laptops", description: "Computers and laptops", parent: "Electronics", sortOrder: 2 },
  { name: "Audio", slug: "audio", description: "Headphones, speakers, and audio equipment", parent: "Electronics", sortOrder: 3 },
  { name: "Clothing", slug: "clothing", description: "Fashion and apparel", sortOrder: 2 },
  { name: "Men", slug: "men-clothing", description: "Men's fashion", parent: "Clothing", sortOrder: 1 },
  { name: "Women", slug: "women-clothing", description: "Women's fashion", parent: "Clothing", sortOrder: 2 },
  { name: "Home & Garden", slug: "home-garden", description: "Home decor and garden supplies", sortOrder: 3 },
  { name: "Sports", slug: "sports", description: "Sports equipment and accessories", sortOrder: 4 },
  { name: "Books", slug: "books", description: "Books and educational materials", sortOrder: 5 },
];

export const PRODUCTS_DATA = [
  // Electronics
  { name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", sku: "APL-IP15PM-256", price: "1199.00", compareAtPrice: "1299.00", category: "Smartphones", description: "Latest iPhone with A17 Pro chip, titanium design, and advanced camera system", isFeatured: true },
  { name: "Samsung Galaxy S24 Ultra", slug: "samsung-s24-ultra", sku: "SAM-S24U-512", price: "1099.00", category: "Smartphones", description: "Flagship Android phone with S Pen and 200MP camera" },
  { name: "MacBook Pro 16\"", slug: "macbook-pro-16", sku: "APL-MBP16-M3", price: "2499.00", category: "Laptops", description: "Powerful laptop with M3 Max chip", isFeatured: true },
  { name: "Dell XPS 15", slug: "dell-xps-15", sku: "DEL-XPS15-I9", price: "1899.00", category: "Laptops", description: "Premium Windows laptop" },
  { name: "Sony WH-1000XM5", slug: "sony-wh1000xm5", sku: "SNY-WH1000XM5", price: "399.00", category: "Audio", description: "Industry-leading noise cancellation headphones", isFeatured: true },
  { name: "AirPods Pro 2", slug: "airpods-pro-2", sku: "APL-APP2-USB", price: "249.00", category: "Audio", description: "Active noise cancellation earbuds" },
  
  // Clothing
  { name: "Classic Denim Jacket", slug: "classic-denim-jacket", sku: "CLO-DNM-JKT-M", price: "89.00", category: "Men", description: "Timeless denim jacket for men" },
  { name: "Slim Fit Chinos", slug: "slim-fit-chinos", sku: "CLO-CHN-SLM-M", price: "59.00", category: "Men", description: "Comfortable slim fit chinos" },
  { name: "Summer Floral Dress", slug: "summer-floral-dress", sku: "CLO-DRS-FLR-W", price: "79.00", category: "Women", description: "Light and breezy summer dress", isFeatured: true },
  { name: "Yoga Leggings", slug: "yoga-leggings", sku: "CLO-LEG-YGA-W", price: "45.00", category: "Women", description: "High-waisted yoga leggings" },
  
  // Home & Garden
  { name: "Smart LED Bulb Set", slug: "smart-led-bulb-set", sku: "HOM-LED-SMT-4P", price: "49.00", category: "Home & Garden", description: "4-pack WiFi enabled smart bulbs" },
  { name: "Robot Vacuum Cleaner", slug: "robot-vacuum", sku: "HOM-VAC-RBT-X1", price: "299.00", category: "Home & Garden", description: "Auto-cleaning robot vacuum", isFeatured: true },
  
  // Sports
  { name: "Yoga Mat Premium", slug: "yoga-mat-premium", sku: "SPT-YGA-MAT-PR", price: "39.00", category: "Sports", description: "Non-slip premium yoga mat" },
  { name: "Adjustable Dumbbells", slug: "adjustable-dumbbells", sku: "SPT-DMB-ADJ-50", price: "199.00", category: "Sports", description: "50lb adjustable dumbbell set" },
  
  // Books
  { name: "The Art of Programming", slug: "art-of-programming", sku: "BOK-PRG-ART-01", price: "45.00", category: "Books", description: "Comprehensive programming guide" },
  { name: "Digital Marketing 2025", slug: "digital-marketing-2025", sku: "BOK-MKT-DIG-25", price: "35.00", category: "Books", description: "Latest digital marketing strategies" },
];

export const USERS_DATA = [
  { email: "admin@abeershop.com", firstName: "Super", lastName: "Admin", role: "super_admin", password: "password123" },
  { email: "john.manager@abeershop.com", firstName: "John", lastName: "Manager", role: "admin", password: "password123" },
  { email: "sarah.staff@abeershop.com", firstName: "Sarah", lastName: "Staff", role: "admin", password: "password123" },
  { email: "mike.johnson@gmail.com", firstName: "Mike", lastName: "Johnson", role: "user", password: "password123" }
];

export const SHIPPING_METHODS_DATA = [
  { name: "Standard Shipping", code: "standard", carrier: "USPS", price: "5.99", estimatedDays: 5, sortOrder: 1 },
  { name: "Express Shipping", code: "express", carrier: "FedEx", price: "12.99", estimatedDays: 2, sortOrder: 2 },
  { name: "Next Day", code: "next-day", carrier: "UPS", price: "24.99", estimatedDays: 1, sortOrder: 3 },
  { name: "Free Shipping", code: "free", carrier: "USPS", price: "0.00", estimatedDays: 7, sortOrder: 4 },
];

export const EMAIL_TEMPLATES_DATA = [
  { name: "Order Confirmation", slug: "order-confirmation", subject: "Order Confirmed - #{orderNumber}", body: "Thank you for your order!" },
  { name: "Order Shipped", slug: "order-shipped", subject: "Your order has been shipped", body: "Your order #{orderNumber} is on the way!" },
  { name: "Welcome Email", slug: "welcome-email", subject: "Welcome to NextEcom", body: "Welcome {userName}!" },
  { name: "Password Reset", slug: "password-reset", subject: "Reset Your Password", body: "Click here to reset your password" },
];

export const SYSTEM_SETTINGS_DATA = [
  { key: "site_name", value: "AbeerShop", type: "string", isPublic: true },
  { key: "site_description", value: "Modern E-commerce Platform", type: "string", isPublic: true },
  { key: "currency", value: "CAD", type: "string", isPublic: true },
  { key: "app.locale", value: "en-CA", type: "string", isPublic: true },
  { key: "app.time_zone", value: "America/Toronto", type: "string", isPublic: false },
  { key: "app.country", value: "CA", type: "string", isPublic: true },
  { key: "tax_rate", value: "0", type: "number", isPublic: true },
  { key: "free_shipping_threshold", value: "3500", type: "number", isPublic: true },
  { key: "low_stock_threshold", value: "5", type: "number", isPublic: false },
  { key: "maintenance_mode", value: "false", type: "boolean", isPublic: true },
];

export const PERMISSIONS_DATA = [
  { resource: "users", action: "view", name: "View Users", slug: "users.view" },
  { resource: "users", action: "create", name: "Create Users", slug: "users.create" },
  { resource: "users", action: "update", name: "Update Users", slug: "users.update" },
  { resource: "users", action: "delete", name: "Delete Users", slug: "users.delete" },
  { resource: "users", action: "manage", name: "Manage Users", slug: "users.manage" },
  { resource: "products", action: "view", name: "View Products", slug: "products.view" },
  { resource: "products", action: "create", name: "Create Products", slug: "products.create" },
  { resource: "products", action: "update", name: "Update Products", slug: "products.update" },
  { resource: "products", action: "delete", name: "Delete Products", slug: "products.delete" },
  { resource: "products", action: "manage", name: "Manage Products", slug: "products.manage" },
  { resource: "orders", action: "view", name: "View Orders", slug: "orders.view" },
  { resource: "orders", action: "create", name: "Create Orders", slug: "orders.create" },
  { resource: "orders", action: "update", name: "Update Orders", slug: "orders.update" },
  { resource: "orders", action: "delete", name: "Delete Orders", slug: "orders.delete" },
  { resource: "orders", action: "manage", name: "Manage Orders", slug: "orders.manage" },
  { resource: "categories", action: "view", name: "View Categories", slug: "categories.view" },
  { resource: "categories", action: "manage", name: "Manage Categories", slug: "categories.manage" },
  { resource: "discounts", action: "view", name: "View Discounts", slug: "discounts.view" },
  { resource: "discounts", action: "manage", name: "Manage Discounts", slug: "discounts.manage" },
  { resource: "refunds", action: "view", name: "View Refunds", slug: "refunds.view" },
  { resource: "refunds", action: "manage", name: "Manage Refunds", slug: "refunds.manage" },
  { resource: "returns", action: "view", name: "View Returns", slug: "returns.view" },
  { resource: "returns", action: "manage", name: "Manage Returns", slug: "returns.manage" },
  { resource: "shipping", action: "view", name: "View Shipping", slug: "shipping.view" },
  { resource: "shipping", action: "manage", name: "Manage Shipping", slug: "shipping.manage" },
  { resource: "customers", action: "view", name: "View Customers", slug: "customers.view" },
  { resource: "customers", action: "manage", name: "Manage Customers", slug: "customers.manage" },
  { resource: "settings", action: "view", name: "View Settings", slug: "settings.view" },
  { resource: "settings", action: "manage", name: "Manage Settings", slug: "settings.manage" },
  { resource: "dashboard", action: "view", name: "View Dashboard", slug: "dashboard.view" },
  { resource: "audit", action: "view", name: "View Audit Logs", slug: "audit.view" },
  { resource: "audit", action: "manage", name: "Manage Audit Logs", slug: "audit.manage" },
  { resource: "roles", action: "view", name: "View Roles", slug: "roles.view" },
  { resource: "roles", action: "manage", name: "Manage Roles", slug: "roles.manage" },
  { resource: "permissions", action: "view", name: "View Permissions", slug: "permissions.view" },
  { resource: "permissions", action: "manage", name: "Manage Permissions", slug: "permissions.manage" },
  { resource: "emails", action: "view", name: "View Emails", slug: "emails.view" },
  { resource: "emails", action: "manage", name: "Manage Emails", slug: "emails.manage" },
  { resource: "notifications", action: "view", name: "View Notifications", slug: "notifications.view" },
  { resource: "notifications", action: "manage", name: "Manage Notifications", slug: "notifications.manage" },
  { resource: "support", action: "view", name: "View Support", slug: "support.view" },
  { resource: "support", action: "manage", name: "Manage Support", slug: "support.manage" },
  { resource: "newsletter", action: "view", name: "View Newsletter", slug: "newsletter.view" },
  { resource: "newsletter", action: "manage", name: "Manage Newsletter", slug: "newsletter.manage" },
  { resource: "health", action: "view", name: "View Health", slug: "health.view" },
  { resource: "health", action: "manage", name: "Manage Health", slug: "health.manage" },
  { resource: "reports", action: "view", name: "View Reports", slug: "reports.view" },
  { resource: "backups", action: "view", name: "View Backups", slug: "backups.view" },
  { resource: "backups", action: "manage", name: "Manage Backups", slug: "backups.manage" },
  { resource: "reviews", action: "view", name: "View Reviews", slug: "reviews.view" },
  { resource: "reviews", action: "manage", name: "Manage Reviews", slug: "reviews.manage" },
  { resource: "security", action: "view", name: "View Security", slug: "security.view" },
  { resource: "security", action: "manage", name: "Manage Security", slug: "security.manage" },
  { resource: "system", action: "logs.view", name: "View System Logs", slug: "system.logs.view" },
  { resource: "system", action: "logs.manage", name: "Manage System Logs", slug: "system.logs.manage" },
];

export const STORIES_DATA = [
  { title: "2025 Tech Trends", slug: "2025-tech-trends", excerpt: "Explore the latest technology trends shaping 2025", content: "Full article content here..." },
  { title: "Summer Fashion Guide", slug: "summer-fashion-guide-2025", excerpt: "Your complete guide to summer 2025 fashion", content: "Full article content here..." },
  { title: "Smart Home Setup", slug: "smart-home-setup-guide", excerpt: "How to set up your smart home in 2025", content: "Full article content here..." },
];
