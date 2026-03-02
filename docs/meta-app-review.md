# Meta App Review Guide

This document covers everything needed to pass Meta App Review for **MetaAds Autopilot**, a Meta Ads management platform that uses AI to create and optimize campaigns. All UI is in Spanish.

---

## Required Permissions

Each permission below must be requested during App Review with a clear justification.

| Permission | Justification |
|---|---|
| `ads_management` | Create, edit, and manage ad campaigns on behalf of the user. MetaAds Autopilot uses this to publish AI-generated campaigns (campaigns, ad sets, and ads) to the user's Meta ad account, update budgets, and toggle campaign/ad set/ad statuses. |
| `ads_read` | Read campaign performance metrics and insights for analytics. The platform syncs daily metrics (spend, impressions, clicks, conversions, CPC, CPM, CTR, ROAS) and breakdown dimensions (age, gender, placement, device) to power the analytics dashboard. |
| `business_management` | Access ad accounts under the user's Business Manager. During onboarding, the platform lists all available ad accounts so the user can select which one to manage. |
| `pages_show_list` | List the user's Facebook pages for ad placement selection. When building a campaign, the user must select a page to serve as the ad's identity. |
| `pages_read_engagement` | Read page engagement data for targeting optimization. The AI analysis engine uses page engagement signals to suggest better audience targeting and ad creative recommendations. |
| `read_insights` | Access detailed campaign analytics and performance breakdowns. This powers the campaign detail page, KPI cards with sparklines, time-series charts, and the AI-driven campaign optimization reports. |

---

## App Review Checklist

- [ ] Business verification completed
- [ ] Privacy Policy URL configured (https://YOUR_DOMAIN/privacy)
- [ ] Terms of Service URL configured (https://YOUR_DOMAIN/terms)
- [ ] Data Deletion Request URL configured (https://YOUR_DOMAIN/api/auth/meta/data-deletion)
- [ ] App icon and description set
- [ ] Demo video uploaded
- [ ] Each permission has detailed use case description
- [ ] Test ad account created for review

---

## Demo Video Script

Record a step-by-step walkthrough of the full platform flow. The video should be 3-5 minutes and show real usage of every permission requested.

1. **Login** -- Show the login page and authenticate with email/password.
2. **Meta Connection** -- Navigate to Settings and click "Conectar Meta" to start the OAuth flow.
3. **OAuth Flow** -- Complete the Meta OAuth dialog, granting the requested permissions.
4. **Connected State** -- Show the connected state with the user's Meta account name displayed.
5. **AI Campaign Builder** -- Navigate to "Nueva campana" (AI builder). Interact with the AI chat to generate a campaign, demonstrating the split-screen chat + preview layout.
6. **Campaign Preview** -- Show the generated campaign with ad sets, ads, targeting, and budget configuration.
7. **Publish Campaign** -- Click publish and show the publish modal with step-by-step progress (creating campaign, ad sets, ads on Meta).
8. **Dashboard Metrics** -- Navigate to the Dashboard and show campaign KPI cards with sparklines, time-series charts, and the campaign list.
9. **Campaign Detail** -- Click into a campaign detail page and show breakdowns by audience, placement, and device.
10. **Automation Rules** -- Navigate to the automation rules page and show rule creation (e.g., pause ad set if CPC exceeds threshold).
11. **Reports** -- Generate a campaign report with AI analysis, showing the executive summary, strengths, weaknesses, and recommendations.
12. **Disconnect** -- Show the ability to disconnect Meta from Settings, demonstrating data control.

---

## Test User Setup

1. Create a Meta Business Manager test account at [business.facebook.com](https://business.facebook.com).
2. Create a test ad account under the Business Manager.
3. Add the app's test user as an admin of the Business Manager.
4. Ensure the test ad account has a valid payment method (test accounts may skip this).
5. Create a test Facebook page for ad placement.
6. Provide the test user credentials in the App Review submission notes.

---

## Data Handling Declaration

### Data Collected

- **Meta user ID and name** -- Retrieved during OAuth for user identification.
- **Ad account IDs and names** -- Retrieved to let the user select which account to manage.
- **Campaign, ad set, and ad performance metrics** -- Synced daily for analytics dashboards and AI optimization.
- **Page IDs and names** -- Retrieved for ad placement selection during campaign creation.

### Data Storage

- All data is stored in **Supabase (PostgreSQL)** with **Row Level Security (RLS)** enforced, ensuring users can only access their own data.
- Meta access tokens are **encrypted with AES-256** (using crypto-js) before being stored in the `meta_connections` table.
- No tokens or sensitive data are stored in client-side storage (localStorage, sessionStorage, or cookies).

### Data Retention

- User data is retained while the account is active.
- Campaign metrics are retained for analytics history as long as the user maintains their account.
- Old notifications are cleaned up after **90 days**.
- Old automation rule executions are cleaned up after **90 days**.

### Data Deletion

- Users can **disconnect Meta** from the Settings page at any time. This deletes the stored Meta tokens and marks the connection as inactive.
- A **data deletion endpoint** is available at `/api/auth/meta/data-deletion` to handle Meta's data deletion callback requests.
- When disconnecting: Meta access tokens are permanently deleted, and the connection record is marked inactive.
- Full account deletion is available upon user request, which removes all associated data from the database.

### Third-party Data Sharing

- **Google Gemini AI** -- Campaign performance data is shared with Google Gemini for AI-powered analysis and optimization recommendations. Data is anonymized and contains no personally identifiable information (PII).
- **Stripe** -- Only the user's email and subscription plan information are shared with Stripe for billing and payment processing.
- **No other third-party data sharing** -- No data is sold, rented, or shared with any other third parties.
