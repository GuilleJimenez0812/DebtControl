package secrets

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveReturnsEnvVarWhenSet(t *testing.T) {
	t.Setenv("TEST_SECRET_XYZ", "real-secret")
	value, err := Resolve("TEST_SECRET_XYZ", EnvDevelopment, "dev-default")
	require.NoError(t, err)
	assert.Equal(t, "real-secret", value)
}

func TestResolveUsesDevDefaultInDevelopment(t *testing.T) {
	t.Setenv("TEST_SECRET_ABC", "")
	value, err := Resolve("TEST_SECRET_ABC", EnvDevelopment, "insecure-dev-default")
	require.NoError(t, err)
	assert.Equal(t, "insecure-dev-default", value)
}

func TestResolveFailsWhenMissingInProduction(t *testing.T) {
	t.Setenv("TEST_SECRET_DEF", "")
	_, err := Resolve("TEST_SECRET_DEF", EnvProduction, "insecure-dev-default")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "TEST_SECRET_DEF")
	assert.Contains(t, err.Error(), "insecure")
}

func TestResolveFailsWhenMissingInUnknownEnvironment(t *testing.T) {
	t.Setenv("TEST_SECRET_GHI", "")
	_, err := Resolve("TEST_SECRET_GHI", "staging", "insecure-dev-default")
	require.Error(t, err)
}

func TestResolveDifferentiatesEnvironments(t *testing.T) {
	t.Setenv("SHARED_SECRET", "")
	// In development the same secret falls back to the dev default.
	dev, err := Resolve("SHARED_SECRET", EnvDevelopment, "dev-default")
	require.NoError(t, err)
	assert.Equal(t, "dev-default", dev)

	// In production the same unset secret is an error.
	_, err = Resolve("SHARED_SECRET", EnvProduction, "dev-default")
	require.Error(t, err)
}

func TestResolveRejectsWhitespaceOnlyValue(t *testing.T) {
	t.Setenv("BLANK_SECRET", "   ")
	// A whitespace-only value is treated as unset: in production it must fail.
	_, err := Resolve("BLANK_SECRET", EnvProduction, "dev-default")
	require.Error(t, err)
}
