package security

import "errors"

// MinPasswordLength is the shared password policy enforced on change and reset.
// Kept in one place so the credential flows (#86 change, #87 reset) agree.
const MinPasswordLength = 12

// ErrPasswordTooShort is returned when a password does not meet the minimum
// length policy.
var ErrPasswordTooShort = errors.New("password must be at least 12 characters")

// ValidatePasswordPolicy enforces the password policy (minimum length). It
// returns ErrPasswordTooShort for too-short passwords and nil otherwise, so the
// same rule drives change-password and reset flows.
func ValidatePasswordPolicy(password string) error {
	if len(password) < MinPasswordLength {
		return ErrPasswordTooShort
	}
	return nil
}
