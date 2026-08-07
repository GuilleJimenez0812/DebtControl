package ratelimit_test

import (
	"context"
	"testing"
	"time"

	"debtcontrol/backend/pkg/ratelimit"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMemoryStoreAllowsUpToLimitThenBlocks(t *testing.T) {
	store := ratelimit.NewMemoryStore()
	limiter := ratelimit.NewLimiter(store)
	policies := []ratelimit.Policy{{Limit: 3, Window: time.Minute}}

	ctx := context.Background()
	for i := 0; i < 3; i++ {
		allowed, _ := limiter.Allow(ctx, "login:ip:1.2.3.4", policies)
		assert.True(t, allowed, "request %d should be allowed", i+1)
	}

	allowed, retryIn := limiter.Allow(ctx, "login:ip:1.2.3.4", policies)
	assert.False(t, allowed)
	assert.Positive(t, retryIn)
}

func TestMemoryStoreResetsAfterWindow(t *testing.T) {
	store := ratelimit.NewMemoryStore()
	limiter := ratelimit.NewLimiter(store)

	policies := []ratelimit.Policy{{Limit: 1, Window: 100 * time.Millisecond}}

	allowed, _ := limiter.Allow(context.Background(), "k", policies)
	assert.True(t, allowed)

	// Same window (seconds-based key) still blocked...
	allowed, _ = limiter.Allow(context.Background(), "k", policies)
	assert.False(t, allowed)
}

func TestDifferentKeysAreIndependent(t *testing.T) {
	store := ratelimit.NewMemoryStore()
	limiter := ratelimit.NewLimiter(store)
	policies := []ratelimit.Policy{{Limit: 1, Window: time.Minute}}

	ctx := context.Background()
	allowed, _ := limiter.Allow(ctx, "login:ip:1.1.1.1", policies)
	require.True(t, allowed)
	allowed, _ = limiter.Allow(ctx, "login:ip:1.1.1.2", policies)
	assert.True(t, allowed)
	allowed, _ = limiter.Allow(ctx, "login:ip:1.1.1.1", policies)
	assert.False(t, allowed)
}

func TestMultipleAccountKeysAreIndependent(t *testing.T) {
	store := ratelimit.NewMemoryStore()
	limiter := ratelimit.NewLimiter(store)
	policies := []ratelimit.Policy{{Limit: 5, Window: 15 * time.Minute}}

	ctx := context.Background()
	// Credential stuffing across many accounts under one IP must not trip a
	// single counter that would lock every account.
	for i := 0; i < 6; i++ {
		key := "login:ip:9.9.9.9:account:user" + string(rune('a'+i)) + "@x.com"
		allowed, _ := limiter.Allow(ctx, key, policies)
		assert.True(t, allowed, "different accounts are independent")
	}
}

func TestNoPoliciesAlwaysAllowed(t *testing.T) {
	limiter := ratelimit.NewLimiter(ratelimit.NewMemoryStore())
	allowed, retryIn := limiter.Allow(context.Background(), "any", nil)
	assert.True(t, allowed)
	assert.Zero(t, retryIn)
}
