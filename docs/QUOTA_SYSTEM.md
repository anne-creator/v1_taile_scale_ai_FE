# Quota System Architecture

## Overview

The quota system manages usage limits and billing for AI generation services. It uses a **dual-pool, dual-measurement** architecture that supports both subscription-based and pay-as-you-go billing, with dollar or unit measurement types.

```
┌─────────────────────────────────────────────────────────┐
│                     Quota System                        │
│                                                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │  Subscription Pool  │  │     Pay-as-you-go Pool   │  │
│  │  (Priority: 1st)    │  │     (Priority: 2nd)      │  │
│  │                     │  │                          │  │
│  │  measurement_type:  │  │  measurement_type:       │  │
│  │  unit (400/month)   │  │  dollar ($0.09/image)    │  │
│  │                     │  │                          │  │
│  │  Resets each billing│  │  Never expires (or       │  │
│  │  cycle (expiry)     │  │  configurable validity)  │  │
│  └─────────────────────┘  └──────────────────────────┘  │
│                                                         │
│  Consumption Order: Subscription → Paygo (FIFO)         │
└─────────────────────────────────────────────────────────┘
```

---

## Database Tables

### `quota` table

Stores all quota grants and consumption records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | text (PK) | UUID |
| `user_id` | text (FK → user) | Owner |
| `pool_type` | text | `subscription` or `paygo` |
| `measurement_type` | text | `dollar` or `unit` |
| `transaction_type` | text | `grant` (positive) or `consume` (negative) |
| `transaction_scene` | text | `subscription`, `payment`, `renewal`, `gift`, `reward` |
| `amount` | numeric(12,4) | Positive for grants, negative for consumes |
| `remaining_amount` | numeric(12,4) | Remaining balance (grant records only, decremented on consume) |
| `expires_at` | timestamp | Null = never expires |
| `status` | text | `active`, `expired`, `deleted` |
| `order_no` | text | Linked payment order |
| `subscription_no` | text | Linked subscription |
| `consumed_detail` | text (JSON) | Breakdown of which grant records were consumed |

### `service_cost` table

Defines the cost of each AI service. Each service has **both** a dollar cost and a unit cost; the system uses whichever one matches the pool's `measurement_type`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | text (PK) | UUID |
| `service_type` | text | `ai-image`, `ai-video`, `ai-music`, `ai-chat` |
| `scene` | text | Sub-type, e.g. `text-to-image`. Empty string = default |
| `dollar_cost` | numeric(8,4) | Cost in dollars (used by dollar-based pools) |
| `unit_cost` | integer | Cost in units (used by unit-based pools) |
| `is_active` | boolean | Whether this cost entry is active |

**Example Configuration:**

```sql
INSERT INTO service_cost (id, service_type, scene, dollar_cost, unit_cost, display_name, is_active)
VALUES (gen_random_uuid(), 'ai-image', '', '0.09', 1, 'AI Image Generation', true);
```

This means:
- Subscription pool (unit-based): 1 unit per image generation
- Paygo pool (dollar-based): $0.09 per image generation

**Lookup Priority:** exact match (service_type + scene) first, then fallback to scene = '' (default for that service type).

**Caching:** Service costs are cached in memory for 5 minutes. Cache is invalidated when admin updates costs.

---

## Core Concepts

### Pool Types

| Pool | Priority | Typical Use | Expiration |
|------|----------|-------------|------------|
| `subscription` | 1st (consumed first) | Monthly subscription quota | Expires at end of billing cycle |
| `paygo` | 2nd (consumed after subscription) | One-time purchases, add-ons | Configurable (valid_days or never) |

### Measurement Types

| Type | How Cost is Calculated | Example |
|------|----------------------|---------|
| `unit` | `service_cost.unit_cost` per generation | 1 unit per image |
| `dollar` | `service_cost.dollar_cost` per generation | $0.09 per image |

A single pool uses one measurement type. The system looks at the pool's `measurement_type` to decide whether to use `unit_cost` or `dollar_cost` from the `service_cost` table.

### FIFO Consumption

When a user generates an image:

1. **Check subscription pool** — sum all active, non-expired grant records with `remaining_amount > 0`
2. If subscription pool has enough balance → consume from it (earliest expiry first)
3. If not → **check paygo pool** with the same logic
4. If neither pool has enough → reject with "Insufficient quota"

Within a single pool, grant records are consumed in FIFO order by `expires_at` (earliest first). A single consumption draws from **one pool type only** (no cross-pool splitting).

---

## How Quota is Granted

### 1. Subscription Purchase / Renewal

**Trigger:** Stripe webhook → `handleCheckoutSuccess()` or `handleSubscriptionRenewal()`

**File:** `src/shared/services/payment.ts`

```
User subscribes → Stripe webhook → Create/update subscription record
                                  → Grant quota (pool: subscription, amount from pricing.json)
                                  → Quota expires at billing cycle end
```

The quota amount and type come from the pricing item's `quota` field in `pricing.json`:

```json
{
  "product_id": "pro-monthly",
  "quota": {
    "pool_type": "subscription",
    "measurement_type": "unit",
    "amount": 400
  },
  "valid_days": 30
}
```

### 2. One-time Pack Purchase

**Trigger:** Stripe webhook → `handleCheckoutSuccess()`

```
User buys pack → Stripe webhook → Create order
                                 → Grant quota (pool: paygo, amount from pricing.json)
                                 → Quota expires after valid_days
```

### 3. Add-on Top-up

**Trigger:** User chooses custom dollar amount (min $3) → Stripe checkout

```
User tops up $10 → Stripe webhook → Create order
                                   → Grant quota (pool: paygo, measurement: dollar, amount: $10)
                                   → Each generation deducts $0.09
                                   → When balance reaches $0, service stops
```

### 4. Initial User Credits

**Trigger:** Auth hook on user creation (`src/core/auth/config.ts`)

**Controlled by admin config keys:**

| Config Key | Type | Default | Description |
|-----------|------|---------|-------------|
| `initial_credits_enabled` | switch | `false` | Enable/disable initial credits |
| `initial_credits_amount` | number | `0` | Amount to grant |
| `initial_credits_valid_days` | number | `0` | 0 = never expires |
| `initial_credits_description` | text | `Initial quota` | Description shown in transaction history |
| `initial_quota_pool_type` | text | `paygo` | Pool type for initial credits |
| `initial_quota_measurement_type` | text | `unit` | Measurement type for initial credits |

These are configured in **Admin > Settings > General > Credit** section.

### 5. Admin Manual Grant

**Function:** `grantQuotaForUser()` in `src/shared/models/quota.ts`

Admin can grant quota to any user with custom pool type, measurement type, amount, and validity.

---

## How Quota is Consumed

### Generation Flow

```
User clicks "Generate" 
  → API route checks: canConsumeService(userId, 'ai-image', scene)
  → If false → return "insufficient quota"
  → If true → createAITask() (in transaction):
      1. Insert ai_task record
      2. consumeQuota() → deduct from subscription pool (or paygo)
      3. Update ai_task with quota info (quotaId, costAmount)
  → If task fails later → refundQuota(quotaId) → restore balance
```

**Key files:**
- `src/app/api/ai/generate/route.ts` — internal generation API
- `src/app/api/v1/generate/route.ts` — public API (API key auth)
- `src/shared/models/ai_task.ts` — atomic task creation + quota consumption
- `src/shared/models/quota.ts` — `consumeQuota()`, `canConsumeService()`, `refundQuota()`

### Refund on Failure

If an AI task fails, the consumed quota is refunded:
- `consumed_detail` JSON on the consume record tracks exactly which grant records were debited
- `refundQuota()` restores `remaining_amount` on each original grant record
- The consume record is marked as `deleted`

---

## Pricing Configuration

### File: `src/config/locale/messages/en/pages/pricing.json`

Each pricing item defines what quota the user receives:

```json
{
  "product_id": "pro-monthly",
  "product_name": "TaleCraft AI Pro Monthly",
  "amount": 3900,
  "currency": "USD",
  "interval": "month",
  "quota": {
    "pool_type": "subscription",
    "measurement_type": "unit",
    "amount": 400
  },
  "valid_days": 30,
  "plan_name": "Pro"
}
```

**`quota` object fields:**
- `pool_type`: Which pool to grant to (`subscription` or `paygo`)
- `measurement_type`: How usage is measured (`unit` or `dollar`)
- `amount`: How much to grant (400 units, or $50 dollars, etc.)

**`valid_days`**: How long the quota is valid. For subscriptions, this is overridden by the actual billing cycle end date from Stripe.

### Add-on Top-up (Dynamic Amount)

The `addon-topup` pricing item uses `amount: 0` as a template. The actual amount is set at checkout time via the `custom_amount` parameter:

```json
{
  "product_id": "addon-topup",
  "quota": {
    "pool_type": "paygo",
    "measurement_type": "dollar",
    "amount": 0
  },
  "interval": "one-time"
}
```

The checkout API (`/api/payment/checkout`) accepts `custom_amount` (in cents, min 300, must be whole dollars) and overrides the template amount.

---

## Frontend Integration

### Settings > Billing Page

Displays three cards in a row:

| Card | Component | Condition |
|------|-----------|-----------|
| Current Subscription | `PanelCard` | Always shown |
| Usage | `UsagePanel` | Shown when user has active subscription |
| Add-on Top-up | `AddonTopup` | Shown only when subscription quota is depleted |

**File:** `src/app/[locale]/(landing)/settings/billing/page.tsx`

### Settings > Credits Page

Displays quota pool overview cards and transaction history.

**File:** `src/app/[locale]/(landing)/settings/credits/page.tsx`

### Generator Components

Image/video/music generators check and display remaining credits before generation:
- Show cost per generation
- Show remaining credits
- Link to `/pricing` when insufficient

---

## Configuration Checklist

To configure the quota system for a new deployment:

### 1. Service Costs (Database)

Insert service cost records for each AI service:

```sql
-- Image generation: 1 unit or $0.09 per generation
INSERT INTO service_cost (id, service_type, scene, dollar_cost, unit_cost, display_name, is_active)
VALUES (gen_random_uuid(), 'ai-image', '', '0.09', 1, 'AI Image Generation', true);

-- Video generation (if applicable)
INSERT INTO service_cost (id, service_type, scene, dollar_cost, unit_cost, display_name, is_active)
VALUES (gen_random_uuid(), 'ai-video', '', '0.50', 5, 'AI Video Generation', true);
```

### 2. Pricing Items (pricing.json)

Define products in `src/config/locale/messages/{locale}/pages/pricing.json`:
- Set `quota.pool_type`, `quota.measurement_type`, `quota.amount` for each item
- Set `valid_days` for expiration

### 3. Initial User Credits (Admin Settings)

In Admin > Settings > General, configure:
- Enable `initial_credits_enabled`
- Set `initial_credits_amount` (e.g., 5)
- Set `initial_credits_valid_days` (e.g., 30, or 0 for never expires)

### 4. Stripe Products

Ensure Stripe products/prices match the pricing.json items. The `payment_product_id` field in pricing items links to Stripe price IDs.

---

## Changing Measurement Types

The system is designed to be flexible. To switch from unit-based to dollar-based (or vice versa) for subscriptions:

1. Update `pricing.json` → change `quota.measurement_type` and `quota.amount`
2. Ensure `service_cost` table has appropriate `dollar_cost` and `unit_cost` values
3. Existing unexpired quota records keep their original measurement type
4. New grants will use the updated configuration
5. The consumption engine handles mixed measurement types correctly (it reads each pool's measurement type independently)

No database migration or code changes required — it's purely configuration.
