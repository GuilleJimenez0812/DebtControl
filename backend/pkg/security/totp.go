package security

import (
	"crypto/rand"
	"encoding/base32"
	"net/url"
	"strings"
	"time"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

const totpSecretKeySize = 20

// GenerateTOTPSecret returns a new RFC 4226 random secret (base32, no padding)
// plus a provisioning URI for QR encoding into an authenticator app.
func GenerateTOTPSecret(issuer string, accountName string) (secret string, provisioningURI string, err error) {
	raw := make([]byte, totpSecretKeySize)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}

	secret = base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(raw)
	provisioningURI = buildOTPAuthURL(secret, issuer, accountName)
	return secret, provisioningURI, nil
}

// ValidateTOTP verifies a presented 6-digit code against the secret with a
// reasonable skew window (one period either side).
func ValidateTOTP(secret string, code string) bool {
	valid, _ := totp.ValidateCustom(
		code,
		secret,
		time.Now().UTC(),
		totp.ValidateOpts{
			Period:    30,
			Skew:      1,
			Digits:    otp.DigitsSix,
			Algorithm: otp.AlgorithmSHA1,
		},
	)
	return valid
}

func buildOTPAuthURL(secret string, issuer string, accountName string) string {
	var builder strings.Builder
	builder.WriteString("otpauth://totp/")
	builder.WriteString(url.QueryEscape(issuer))
	builder.WriteString(":")
	builder.WriteString(url.QueryEscape(accountName))
	builder.WriteString("?secret=")
	builder.WriteString(secret)
	builder.WriteString("&issuer=")
	builder.WriteString(url.QueryEscape(issuer))
	return builder.String()
}
