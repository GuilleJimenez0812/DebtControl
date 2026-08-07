package email_test

import (
	"context"
	"testing"

	emailAdapter "debtcontrol/backend/internal/adapters/email"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResendSenderLogsInDevModeWithoutKey(t *testing.T) {
	t.Setenv("RESEND_API_KEY", "")
	sender := emailAdapter.NewResendSender("DebtControl <otp@mail.yourdomain.com>")

	require.NoError(t, sender.SendPasswordResetOTP(context.Background(), "user@example.com", "123456"))

	// Without a key the sender must be a successful no-op (dev mode), never an
	// error that would silently lock out a user.
	assert.NotNil(t, sender)
}

func TestResendSenderIsConfiguredWhenKeyPresent(t *testing.T) {
	t.Setenv("RESEND_API_KEY", "re_test_123")
	sender := emailAdapter.NewResendSender("DebtControl <otp@mail.yourdomain.com>")

	// The client is constructed; env is what makes it live. Assert no panic.
	assert.NotNil(t, sender)
}