# Research: $0 transactional email provider for OTP password-recovery emails

**Date:** 2026-08-06
**Context:** Small self-hosted Go (1.26, Gin) app on Render (free tier) + local Docker. Sole email purpose: one-time passwords (OTP) for password recovery. Evaluated providers against a truly fre $0 plan.

## Recommendation (one line)

**Use Resend** — its Free plan is $0 forever, gives 3,000 emails/mo (100/day) to *arbitrary recipients* after a free DNS-only domain verification, has a first-class official Go SDK, and is reachable from the Render free tier over plain HTTPS.

Follow-up notes:
- No expense or cap risk for an OTP workload (a small app does maybe a few hundred password-recovery emails a month; 100/day is plenty).
- The only on-ramp friction is verifying one domain (you add 3 DNS records; no credit card/billing required). Do that once and you can send to any inbox.
- If Resend's 100/day cap ever gets tight, SMTP2GO (1,000/mo, 200/day, permanent free) and Brevo (300/day, ~9,000/mo) are the two solid drop-in fallbacks with a REST API.

---

## Comparison table

| Provider | Free limit | Sends to arbitrary recipients? | Domain/sender verification needed? | Go client / API | Verdict |
|---|---|---|---|---|---|
| **Resend** | 3,000/mo, 100/day | **Yes** after DNS-verifying 1 domain (free) | Yes — DNS only, no billing/card | Official `resend-go` v3 + REST | **✅ Winner** |
| SMTP2GO | 1,000/mo, 200/day (forever) | Yes | Yes — verify sender domain/email (free); else throttled to 25/hr | REST API + SMTP; no official Go SDK | Good fallback |
| Brevo (Sendinblue) | 300/day (~9,000/mo) | Yes | Yes — verified sender; adds Brevo branding; SMS/mkt features gated | REST + generated Go client; SMTP | Good fallback, more friction |
| Mailtrap (Email API/SMTP product) | ~1,000–4,000/mo (150/day) | Yes | Yes — 1 sending domain DNS verify (free) | REST API + SMTP | Good, but positioning is a testing sandbox |
| Amazon SES | 3,000/mo free **for 12 months only**, then $0.10/1k (pay-as-you-go) | **No** until you request "production access" & get approved (sandbox → verified-only first; 1–3 business days) | Yes — domain + IAM; AWS/IAM getting-started complexity | `aws-sdk-go-v2` | Not permanent $0; sandbox approval friction |
| Twilio SendGrid | 100/day **60-day trial only**, then $19.95/mo | Yes (after Sender Identity) | Yes — Single Sender / Domain verification | Official API + libs | Rejected — free tier expiring (no permanent free) |
| Mailgun | 100/day (free tier) | No on free tier — sandbox only lets you reach a few verified recipients until billing is attached | Yes — domain | REST + SMTP | Rejected — free tier is basically a sandbox; billing needed to send to real inboxes |
| Postmark | 100/mo (free "Developer" plan, no expiry) | Yes but only 100/mo hard cap, no overages | Yes — (sender signature) | Official Go lib | Rejected — too small for arguably production OTP |
| Gmail SMTP (app password) | 500/day recipient cap, $0 | Technically yes | Uses your @gmail.com From; no SPF/DKIM control | Plain SMTP | **Rejected** — violates Google's sending-app Terms, low control, easy to get blocked, bad deliverability for a service |

---

## Free-tier limits (detail)

- **Resend** — $0 forever. 3,000 emails/mo, hard 100/day cap, 1 custom domain, 1 webhook endpoint, 30-day log retention. Sends to *any* recipient once your domain is verified; you can send from any address at that domain. 1 marketing audience (1,000 contacts) included. No dedicated IP. ([resend.com/pricing](https://resend.com/pricing), [resend.com/pricing.md](https://resend.com/pricing.md))
- **SMTP2GO** — $0 forever. 1,000 emails/mo, 200/day, 5 verified senders, not credit card. Requires verifying a sender domain (adds SPF/DKIM) or a single sender email — until verified, throttled to 25 emails/hr. Queues daily overflow, hard-stops on monthly cap. 5-day log retention, 1 webhook, 2 team members. ([smtp2go.com /pricing](https://www.smtp2go.com/pricing/), [Free Plan support doc](https://support.smtp2go.com/hc/en-gb/articles/223087947-Free-Plan))
- **Brevo** — $0 forever. 300 emails/day reset-every-day; roughly 9,000/mo. No card. Unlimited contact storage; automation capped at 2,000 contacts; Brevo logo on marketing emails; some features (ab-tests/landing pages) gated. Requires a verified sender and full profile before you can send, plus domain authentication for production deliverability. ([Brevo FAQs / Free plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [brevo.com/products/transactional-email](http://brevo.com/products/transactional-email))
- **Amazon SES** — Not a permanent free plan: 3,000 free message charges/mo for the **first 12 months** only, then pay-as-you-go $0.10 per 1k. New AWS accounts get $200 credits (6 mo) instead. All SES accounts start in a **sandbox** where you can only send to verified addresses / mailboxes simulate until AWS approves a "production access" request (1–3 business days) — there's no safe way to hit arbitrary recipients at signup. Requires IAM credentials plus SPF/DKIM DNS. ([AWS pricing](https://aws.amazon.com/ses/pricing/), [Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html))
- **SendGrid (Twilio)** — No permanent free tier anymore. The free tier is 100 emails/day for a **60-day** trial, then you must pay $19.95/mo (Essentials). Sending pauses / contacts deleted after the trial if you don't upgrade. ([Twilio Help Center — trial plan](http://help.twilio.com/articles/47846436523419), [Twilio changelog](https://www.twilio.com/en-us/changelog/sendgrid-free-plan))
- **Mailgun** — Free tier: 100 emails/day, 1 domain, no card, but it is effectively a testing sandbox: a new free account can only send to a few verified recipients until you add billing (you can remain "on Pay-As-You-Go" but that's no longer $0). Not $0 for real arbitrary-recipient production. ([Mailgun Help](https://help.mailgun.com/hc/en-us/articles/203068914-What-does-the-Free-plan-offer))
- **Postmark** — Developer/Free plan: 100 emails/mo, no expiry, **no overages**; sending pauses at 100. Great deliverability but too small to run real OTP production. Paid starts at $15/mo (10,000 emails). ([postmarkapp.com/pricing](https://postmarkapp.com/pricing))
- **Mailtrap** — Two products. The Email **Sandbox** is capture-only (50 test emails/mo free) — NOT for real delivery. The Email API/SMTP sending product is free at ~1,000–4,000 emails/mo (150/day) with 1 sending domain (DNS verify). Viable but Mailtrap's identity is developer "testing"; Resend/SMTP2GO are more production-minded. ([mailtrap.io/pricing](https://mailtrap.io/pricing/), [Sending Limits](https://docs.mailtrap.io/email-api-smtp/setup/sending-limits))
- **Gmail SMTP (app password)** — Free, ~500 recipients/day. But sending from an app via `smtp.gmail.com` spams against Google's Terms of Service for an "app," gives no SPF/DKIM control over the From identity, and Google applies behavioral throttles that can lock the account. Unreliable for service-hosted transactional email and risky for a production address. ([Google limits](https://support.google.com/mail/answer/22839) context, [unanswered.io guide](http://unanswered.io/guide/gmail-email-sending-limits))

Key decision driver: the winner must be **permanently $0** (not a 12-month AWS free tier, not SendGrid's 60-day trial) **and** reach arbitrary recipients without billing/card and without a sandbox gate. Resend satisfies all: permanent free, DNS-only domain verify, no credit. SMTP2GO and Brevo also qualify; SendGrid, SES, Mailgun, Postmark, Gmail do not.

---

## Integration steps for the winner — Resend

### 1. One-time account setup (no card)
1. Create a free account at [resend.com](https://resend.com) (Free plan, $0).
2. In the dashboard, **Domains → Add Domain**, enter your sending domain/subdomain (e.g. `mail.yourdomain.com`). Resend gives 3 DNS records (2 DKIM CNAMEs + + 1 MX for verification; SPF included).
3. Add those records to your DNS provider (free, just DNS).
4. Once the domain shows **Verified**, you can send to *any* recipient. No production-access approval step, no card.
5. Generate an API key: **API Keys → Create** (`re_...`). Store it as env var.

### 2. Environment variable
```env
RESEND_API_KEY=re_YOUR_API_KEY
```
Use exactly `RESEND_API_KEY` (Resend's SDK reads it automatically). Set it in Render's env config and in your local `.env` (Docker).

### 3. Go library (official, first-class)
```
go get github.com/resend/resend-go/v3
```
Docs: https://pkg.go.dev/github.com/resend/resend-go/v3 — repo: https://github.com/resend/resend-go

Minimal usage:
```go
package email

import (
	"context"
	"os"

	"github.com/resend/resend-go/v3"
)

func sendOTP(ctx context.Context, to, subject, body string) error {
	client := resend.NewClient(os.Getenv("RESEND_API_KEY"))

	_, err := client.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
		From:    "Acme <otp@yourdomain.com>", // any address at your verified domain
		To:      []string{to},
		Subject: subject,
		Text:    body,
	})
	return err
}
```
Note the `From` domain must match a domain you verified. Since the app is Go/Gin, call this from your OTP request handler. Render free tier reaches the API fine over HTTPS.

### 4. Raw REST API (if you prefer not to use the SDK)
- Endpoint: `POST https://api.resend.com/emails`
- Auth: HTTP header `Authorization: Bearer re_YOUR_API_KEY`
- Request body (single OTP send):
```json
{
  "from": "Acme <otp@yourdomain.com>",
  "to": ["dev@example.com"],  // arbitrary verified recipient
  "subject": "Your password reset code",
  "text": "Your one-time code is 123456. It expires in 10 minutes."
}
```
- Response: `200` with `{"id": "..."}` if accepted. A non-2xx body contains a readable reason (e.g. `domain not verified` or `daily limit reached`).

### Render compatibility
- Outbound HTTPS from Render free tier is unrestricted, so `api.resend.com` is reachable with no extra config. Same for local Docker.
- If you're still worried about reachability/egress, the same `POST /emails` can be tested from anywhere; no IP allowlisting is required (unlike SMTP2GO's optional IP allowlist or Gmail's relay whitelist).

### Suggested mitigations given free limits
- Add a tiny local cache/rate-limit so repeated recovery requests don't burst past 100/day (front-end throttle the OTP + expire codes in ~10 min).
- Log `sent.Id` and surface Resend API errors to your HTTP handler so a silent fail can't lock out a user.

---

## Sources

- Resend pricing (official): https://resend.com/pricing and https://resend.com/pricing.md — free 3,000/mo, 100/day, 1 domain.
- Resend domains/verification docs: https://resend.com/docs/dashboard/domains/introduction
- Resend Go SDK: https://github.com/resend/resend-go and https://pkg.go.dev/github.com/resend/resend-go/v3
- SMTP2GO Free Plan: https://support.smtp2go.com/hc/en-gb/articles/223087947-Free-Plan ; pricing https://www.smtp2go.com/pricing/
- Brevo Free plan limits (official FAQ): https://help.brevo.com/hc/en-us/articles/208580669-What-are-the-limits-of-the-Free-plan ; transactional: http://brevo.com/products/transactional-email
- Amazon SES pricing: https://aws.amazon.com/ses/pricing/ ; Request production access: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- Twilio SendGrid trial (official help): https://help.twilio.com/articles/47846436523419 ; changelog: https://www.twilio.com/en-us/changelog/sendgrid-free-plan
- Mailgun free tier (official help): https://help.mailgun.com/hc/en-us/articles/203068914-What-does-the-Free-plan-offer
- Postmark pricing: https://postmarkapp.com/pricing
- Mailtrap pricing: https://mailtrap.io/pricing/ ; sending limits: https://docs.mailtrap.io/email-api-smtp/setup/sending-limits
- Gmail sending limits: https://support.google.com/mail/answer/22839 (official); third-party recap: http://unanswered.io/guide/gmail-email-sending-limits