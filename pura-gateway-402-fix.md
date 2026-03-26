# Pura Gateway: 402 Flow Fix

**Objective:** Update the Pura Gateway to handle free-tier transitions by:
1. Adding Lightning funding invoices directly in the `402` response.
2. Simplifying free-tier messaging.
3. Removing wallet-linking requirements.
4. Testing the payment round-trip.

---

### Step 1: Locate the 402 Logic

Navigate to the Pura Gateway API’s folder:
- Path: `/gateway/app/api`
- File: Likely `routes.js`, `freeTier.js`, or similar.

Find the existing `402` response:
```javascript
if (freeTierExceeded(user)) {
    return res.status(402).json({
        error: "free_tier_exceeded",
        message: "Free tier usage exceeded. Please upgrade."
    });
}
```

### Step 2: Add Lightning Invoice Generation

Replace the response logic with invoice creation:
```javascript
const Lightning = require("./services/lightning"); // Adjust path as needed

if (freeTierExceeded(user)) {
    const amountNeeded = 100; // Customize by usage or rates
    const invoice = await Lightning.generateInvoice(user.id, amountNeeded);

    return res.status(402).json({
        error: "free_tier_exceeded",
        message: "Free tier limit reached. Pay the attached invoice to continue.",
        invoice: invoice.lnurl
    });
}
```
- Ensure the `Lightning` module handles invoice generation.
- Use the LNURL format to make payments client-friendly.

### Step 3: Update Authentication

Refactor any wallet-linking checks to verify **only the user’s balance:**
```javascript
const balance = await Lightning.checkBalance(user.id);
if (balance <= 0) {
    throw new Error("Insufficient balance");
}
```

Remove any other checks like `walletLinked` if present.

### Step 4: Test the Flow

Run integration tests for these flows:
1. Free-tier user exceeds requests.
2. 402 response includes a valid invoice.
3. User pays invoice via Lightning.
4. Balance credits successfully.
5. Requests resume upon sufficient funds.

Use tools like `curl`, Postman, or an SDK script to verify each step works as expected.

### Step 5: Push and Deploy

1. Commit changes:
```bash
cd gateway
npm test
npm run lint

# Commit and push
git add .
git commit -m "Fix: Add Lightning invoices to 402 response"
git push origin <branch>
```

2. Deploy updated Gateway to Vercel or your chosen platform.
3. Double-check production integration with Lightning settlement services.