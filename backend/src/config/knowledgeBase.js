// BookLeaf Knowledge Base, split by ticket category so each draft prompt
// only carries the policy section (and sample reply) it actually needs.

export const COMPANY_OVERVIEW = `BookLeaf Publishing is a self-publishing company operating in India and the US.
Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid, with marketing and distribution add-ons).
BookLeaf handles cover design, typesetting, ISBN assignment, printing, distribution and royalty management.
In-house printing facility and warehouse in Delhi; print partners Repro India and Epitome Books.`;

export const TONE_GUIDELINES = `- Always empathetic and professional. Authors are our partners, not customers to be managed.
- Acknowledge the author's concern before jumping to solutions.
- Be specific: use actual numbers, dates and statuses wherever possible rather than vague reassurances.
- If something is BookLeaf's fault (delayed royalties, ISBN error), own it directly. No corporate deflection.
- If the issue needs escalation or investigation, give a clear timeline (e.g. "within 48 hours"), never open-ended promises.
- Always end with a clear next step for the author and/or the BookLeaf team.`;

export const CATEGORY_KNOWLEDGE = {
  'Royalty & Payments': {
    policy: `- 80/20 royalty split: 80% of net profit per book goes to the author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart) and shipping charges.
- Royalties are calculated quarterly and paid within 45 days of the quarter ending.
- Minimum payout threshold is ₹1,000; smaller balances roll over to the next quarter.
- Payouts go by bank transfer to the account linked in the author's dashboard.
- Authors can see a detailed royalty breakdown per platform in their dashboard.`,
    example: `Query: "I published my book 4 months ago and still haven't received any royalty."
Approach: acknowledge the frustration, explain the quarterly cycle and 45-day payout window, check the bank details are linked, give the specific next payout date, and if genuinely overdue escalate with a 48-hour resolution timeline.
Query: "I sold 200 copies but only received ₹3,000."
Approach: explain the net profit calculation openly, offer a line-by-line royalty breakdown, never be defensive.`,
  },
  'ISBN & Metadata Issues': {
    policy: `- Every BookLeaf book gets a unique ISBN assigned by BookLeaf, registered under BookLeaf's publisher imprint.
- Authors wanting an ISBN under their own imprint must obtain it independently.
- ISBN errors (duplicate, wrong book linked) are high priority and escalated to the production team.
- Metadata updates (e.g. description) can be submitted through the dashboard or by email; changes reflect on platforms within 3-5 business days.`,
    example: `Query: "My book shows a different ISBN on Amazon than on the physical copy."
Approach: treat as high priority, acknowledge it is a serious data issue, confirm immediate escalation to the production team, give a 48-hour resolution timeline.`,
  },
  'Printing & Quality': {
    policy: `- Most orders are printed in-house; overflow or special formats go to Repro India or Epitome Books.
- Standard print turnaround: 5-7 business days from order confirmation.
- For quality issues (misprints, binding defects, colour inconsistency) BookLeaf arranges a free reprint after verification; the author may need to share photos of the defective copy.`,
    example: `Query: "My author copies have blurry images and misaligned pages."
Approach: apologise sincerely, ask for photos of the defective copies, confirm a free reprint once verified, give a 5-7 business day reprint timeline.`,
  },
  'Distribution & Availability': {
    policy: `- Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK and the BookLeaf Store.
- New listings usually go live within 7-10 business days after publication is complete.
- A book showing as unavailable usually means a stock sync issue; BookLeaf can trigger a re-sync, live again within 24-48 hours.`,
    example: `Query: "My book is published but shows 'Currently Unavailable' on Amazon."
Approach: explain it is typically a stock sync issue, confirm a re-sync is being triggered with the distribution team, set the 24-48 hour expectation.`,
  },
  'Book Status & Production Updates': {
    policy: `- Stages: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
- Authors are emailed at each stage.
- Delays usually happen at Cover Design (waiting for author approval) and Proofreading (revision rounds).`,
    example: `Query: "It's been 3 weeks and my book is still in typesetting."
Approach: state the actual production status, be honest about any delay and why, give a specific updated timeline, frame it collaboratively and never blame the author.`,
  },
  'General Inquiry': {
    policy: `- Metadata such as the book description can be updated after going live via the dashboard or by emailing BookLeaf; changes reflect within 3-5 business days.
- For anything outside the policies above, say the team will check and reply with a clear timeline.`,
    example: `Query: "Can I update my book's description on Amazon after it's live?"
Approach: confirm yes, explain it can be done via the dashboard or email, changes reflect within 3-5 business days.`,
  },
};
