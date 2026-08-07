package email

import (
	"context"
	"log"
	"os"

	"github.com/resend/resend-go/v3"
)

// ResendSender delivers password-reset OTP emails through the Resend API
// (free tier, $0). It reads RESEND_API_KEY from the environment; the SDK also
// does that automatically. When no key is configured the sender is a no-op
// that logs the code (development), never failing the request.
type ResendSender struct {
	client     *resend.Client
	from       string
	configured bool
}

// NewResendSender builds a sender. `fromAddress` must belong to a domain
// verified in Resend (e.g. "otp@mail.yourdomain.com"). Without RESEND_API_KEY
// the sender logs instead of sending, so local dev works with no credentials.
func NewResendSender(fromAddress string) *ResendSender {
	apiKey := os.Getenv("RESEND_API_KEY")
	configured := apiKey != ""
	if configured {
		return &ResendSender{client: resend.NewClient(apiKey), from: fromAddress, configured: true}
	}
	return &ResendSender{from: fromAddress, configured: false}
}

func (sender *ResendSender) SendPasswordResetOTP(ctx context.Context, toEmail string, code string) error {
	if !sender.configured || sender.client == nil {
		log.Printf("[email] dev mode: would send password reset OTP %q to %s", code, toEmail)
		return nil
	}

	_, err := sender.client.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
		From:    sender.from,
		To:      []string{toEmail},
		Subject: "Your DebtControl password reset code",
		Text: "Use this one-time code to reset your DebtControl password:\n\n" +
			code + "\n\nIt expires in 10 minutes. If you did not request this, ignore this email.",
	})
	return err
}
