package security

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidatePasswordPolicyAcceptsLongEnough(t *testing.T) {
	assert.NoError(t, ValidatePasswordPolicy(strings.Repeat("a", MinPasswordLength)))
	assert.NoError(t, ValidatePasswordPolicy(strings.Repeat("b", MinPasswordLength+10)))
}

func TestValidatePasswordPolicyRejectsTooShort(t *testing.T) {
	err := ValidatePasswordPolicy(strings.Repeat("a", MinPasswordLength-1))
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrPasswordTooShort)
}

func TestValidatePasswordPolicyRejectsEmpty(t *testing.T) {
	assert.ErrorIs(t, ValidatePasswordPolicy(""), ErrPasswordTooShort)
}