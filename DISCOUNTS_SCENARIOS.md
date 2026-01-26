# Discounts creation scenarios (Admin)

This project supports multiple discount kinds. The admin **Add/Edit Discount** modal is a “kind-first” flow: you pick the discount kind first, and only the required fields appear.

## Common fields (all kinds)

- **Name**: required.
- **Status**: `draft` or `active`.
- **Starts at / Ends at**:
  - Optional.
  - If set, discount only applies when `now` is within the window.
- **Scope**:
  - Use `all` for these scenarios.
  - (Other scopes exist, but are not part of the simplified flow.)

## Kind 1: Coupon (code-based discount)

### What it does
- User enters a code on cart/checkout.
- The discount applies if the code exists, is active, within time window, and applicable to cart.

### Required inputs
- **Discount kind**: `Coupon`
- **Code**: required (non-empty). Stored normalized (uppercased).
- **Type**: `percentage` or `fixed_amount` (or other supported types).
- **Value**: required.

### Optional inputs
- **Usage limit**: optional.
- **Min subtotal** (if supported by the UI): optional.
- **Product / Category targeting** (if enabled): optional.

### Backend shape (metadata)
- `metadata.kind = "discount"`
- `isAutomatic = false`

### Example scenario
- **10% off** with code `SAVE10`.

## Kind 2: Scheduled Offer (price offer)

### What it does
- This is an **automatic** promotion that changes item pricing during cart total recalculation.
- It is used for “Sale” style pricing and can be displayed on the homepage/offer banners.

### Required inputs
- **Discount kind**: `Scheduled Offer`
- **Offer type**: standard scheduled offer (not bundle, not deal)
- **Type**: typically `percentage`.
- **Value**: required.
- **Targeting**:
  - Select **products** and/or **categories**.
  - Avoid leaving targeting empty unless you intentionally want a global offer.

### Optional inputs
- **Offer image**: optional; stored in `metadata.display.imageUrl`.

### Backend shape (metadata)
- `metadata.kind = "offer"`
- `metadata.offerKind = "standard"`
- `isAutomatic = true`
- Targets stored via `discount_products` and `discount_categories` relations.

### Example scenario
- “Winter Sale” **25% off** on a set of selected products for a date window.

## Kind 3: BXGY Generic (Buy X Get Y, same product)

### What it does
- This is an **automatic deal**.
- Applies when the cart has enough quantity of the targeted product(s).
- Cheapest-free logic (for the eligible lines): you effectively get `getQty` items free per `buyQty + getQty` group.

### Required inputs
- **Discount kind**: `BXGY Generic`
- **Buy qty**: required integer (e.g. 2)
- **Get qty**: required integer (e.g. 1)
- **Targeting**: select product(s) this deal applies to.

### Backend shape (metadata)
- `metadata.kind = "deal"`
- `metadata.offerKind = "bxgy_generic"`
- `metadata.bxgy = { buyQty, getQty }`
- `isAutomatic = true`

### Example scenario
- “Buy 2 Get 1 Free” on Product A:
  - If Product A price is 10 and cart has quantity 3, discount amount is 10.

## Kind 4: BXGY Bundle (Buy list + Get list)

### What it does
- This is an **automatic deal**.
- You define a **buy list** (products + quantities) and a **get list** (products + quantities).
- When cart meets buy requirements, the get products are discounted (free) up to the allowed quantities.

### Required inputs
- **Discount kind**: `BXGY Bundle`
- **Buy list**: one or more entries:
  - `productId`
  - `quantity`
- **Get list**: one or more entries:
  - `productId`
  - `quantity`

### Backend shape (metadata)
- `metadata.kind = "deal"`
- `metadata.offerKind = "bxgy_bundle"`
- `metadata.bxgyBundle = { buy: [{productId, quantity}], get: [{productId, quantity}] }`
- `isAutomatic = true`

### Example scenario
- Buy 1 of Product A, get 1 of Product B free:
  - If A is 50 and B is 30 and both are in cart, discount amount is 30.

## Notes / constraints

- **Coupon codes** cannot be used on automatic discounts.
- **Scheduled offers** affect line unit prices during cart recalculation.
- **Deals (BXGY)** affect the cart’s `discountAmount` (not the unit price).
- Validation scripts are available:
  - `npm run discount:validate:coupon`
  - `npm run discount:validate:scheduled-offer`
  - `npm run discount:validate:bxgy-generic`
  - `npm run discount:validate:bxgy-bundle`
  - `npm run discount:validate:all`
