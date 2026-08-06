package security_test

import (
	"testing"
	"time"

	"debtcontrol/backend/pkg/security"

	"github.com/stretchr/testify/assert"
)

func TestPasswordHashingAndVerification(t *testing.T) {
	plainPassword := "SecurePassword123!"
	hashedPassword, err := security.HashPassword(plainPassword)

	assert.NoError(t, err)
	assert.NotEmpty(t, hashedPassword)

	err = security.ComparePassword(hashedPassword, plainPassword)
	assert.NoError(t, err)

	err = security.ComparePassword(hashedPassword, "WrongPassword")
	assert.Error(t, err)
}

func TestJWTGenerationAndValidation(t *testing.T) {
	jwtSecret := "super-secret-key-12345"
	tokenString, tokenID, err := security.GenerateAccessToken("user-123", "user@example.com", "admin", jwtSecret, 15*time.Minute)

	assert.NoError(t, err)
	assert.NotEmpty(t, tokenString)
	assert.NotEmpty(t, tokenID)

	claims, err := security.ValidateToken(tokenString, jwtSecret)
	assert.NoError(t, err)
	assert.Equal(t, "user-123", claims.UserID)
	assert.Equal(t, "user@example.com", claims.Email)
	assert.Equal(t, "admin", claims.Role)
	assert.Equal(t, tokenID, claims.TokenID)
}
