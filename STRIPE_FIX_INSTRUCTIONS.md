# Fix "Pay to akash" Issue in Stripe Checkout

The "Pay to akash" text appearing in Stripe checkout is controlled by your **Stripe account's business name**, not by the code. Here's how to fix it:

## Solution: Update Stripe Account Business Name

### Option 1: Update Default Business Name (Recommended)

1. **Log in to Stripe Dashboard**
   - Go to https://dashboard.stripe.com/
   - Sign in to your account

2. **Navigate to Account Settings**
   - Click on **Settings** in the left sidebar
   - Click on **Account Settings** (or **Business Settings**)

3. **Update Business Information**
   - Find the **Business name** or **Public business information** section
   - Change the business name from "akash" to your desired name (e.g., "Swing Mag", "Will Mag", etc.)
   - Save the changes

4. **Update Statement Descriptor** (Optional but recommended)
   - In the same section, find **Statement descriptor**
   - Update it to match your business name
   - Note: Statement descriptors have character limits (usually 22 characters)

### Option 2: Use Stripe Connect (For Multiple Models)

If you want each model to have their own "Pay to [Model Name]" display:

1. **Set up Stripe Connect**
   - Each model needs their own Stripe Connect account
   - Use `payment_intent_data.on_behalf_of` or `transfer_data.destination` in checkout sessions
   - This requires additional setup and approval from Stripe

### Option 3: Custom Checkout (Advanced)

If you need full control over the checkout UI:
- Use Stripe Elements to build a custom checkout form
- This gives you complete control over the UI but requires more development work

## Current Code Implementation

The code already includes:
- `statement_descriptor` in payment intent (for bank statements)
- `statement_descriptor_suffix` (for additional statement text)
- Model name in product description and metadata

However, the **"Pay to [name]"** text in the checkout header is **hardcoded by Stripe** based on your account's business name.

## Quick Fix

**The fastest solution is to update your Stripe account's business name in the Stripe Dashboard.**

After updating, the change will take effect immediately for all new checkout sessions.

