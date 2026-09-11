# Implementation Plan - Donation Screen Redesign (High-End Premium)

[Overview]

Redesign the entire TypeNova donation experience as a single, premium, high-end visual surface. The current system splits donation across two surfaces - a DonateModal popup (4 tabs) and a PatronVault full page (3 tabs) - creating redundancy and visual inconsistency. This plan consolidates into one redesigned full-page experience at /donate, removes the modal entirely, and elevates the nav bar integration. Visual direction: high-end design principles - refined typography hierarchy, premium color palette (deep obsidian, champagne gold accents, subtle warm gradients), deliberate whitespace, purposeful micro-animations, single-column focused donation flow.

Scope: DonateModal.tsx deleted. PatronVault.tsx fully rewritten. donation.ts config enhanced. donation.test.ts rewritten. App.tsx, AppModalManager.tsx, CosmicNavBar.tsx, SettingsModal.tsx, layout.ts cleaned of modal wiring. changelog.ts + CHANGELOG.md updated.

[Types]

Enhancements to src/data/donation.ts:

- PatronEntry { name, amount, platform ('upi'|'kofi'|'bmc'|'paypal'|'github'|'crypto'), message?, date } - featured supporters for the patron wall
- DonationConfig gains featuredPatrons: PatronEntry[] (3-5 social-proof entries) and impactStats: { testsHosted, serversPaid, tuitionPercent }
- PREMIUM_ACCENT = '#d4af37' (champagne gold), PATRON_WALL_MAX = 5

[Files]

Delete: src/components/DonateModal.tsx.
Modify: src/pages/PatronVault.tsx (full rewrite ~550 lines), src/data/donation.ts, src/tests/donation.test.ts, src/App.tsx, src/components/AppModalManager.tsx, src/components/CosmicNavBar.tsx, src/components/SettingsModal.tsx, src/lib/layout.ts, src/data/changelog.ts, CHANGELOG.md.

[Functions]

Removed: DonateModal component, case 'donate' modal branch, onOpenDonate modal path.
New (inside PatronVault): AnimatedProgressRing, MilestoneRail, PaymentMethodCard, PatronWall.
Modified: onOpenDonate navigates directly to /donate without closeModal().
Unchanged: getDonationProgressPercent.

[Dependencies]

None added or removed. Reuses qrcode, framer-motion, lucide-react, sonner.

[Testing]

src/tests/donation.test.ts rewritten: config validity, impactStats bounds, featuredPatrons cap/sort, progress calculation, title badge, milestone ordering. Manual matrix covers /donate flow desktop+mobile, QR generation, keyboard/shader guards.

[Implementation Order]

1. src/data/donation.ts data layer
2. src/tests/donation.test.ts + run_e2e 100%
3. Delete DonateModal.tsx
4. Clean layout.ts, AppModalManager.tsx, App.tsx, SettingsModal.tsx
5. Redesign CosmicNavBar.tsx
6. Rewrite PatronVault.tsx
7. Changelog entries
8. Final validation (run_e2e 100%, npm run build)
