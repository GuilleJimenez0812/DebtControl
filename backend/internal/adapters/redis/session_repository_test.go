package redis_test

import (
	"context"
	"testing"
	"time"

	"debtcontrol/backend/internal/adapters/redis"
	"debtcontrol/backend/internal/core/ports"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const ttl = 24 * time.Hour

func newTestStore() *redis.MemorySessionRepository {
	return redis.NewMemorySessionRepository()
}

func TestCreateRefreshSessionReturnsTokenAndFamily(t *testing.T) {
	store := newTestStore()
	token, family, err := store.CreateRefreshSession(context.Background(), "user-1", ttl)
	require.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.NotEmpty(t, family)
	// plaintext token is never persisted in clear
	assert.NotContains(t, store.SnapshotActiveTokens(), token)
}

func TestRefreshSessionRotatesToken(t *testing.T) {
	store := newTestStore()
	token, _, err := store.CreateRefreshSession(context.Background(), "user-1", ttl)
	require.NoError(t, err)

	_, _, newToken, err := store.RefreshSession(context.Background(), token, ttl)
	require.NoError(t, err)
	assert.NotEmpty(t, newToken)
	assert.NotEqual(t, token, newToken)

	// old token is now spent -> presenting it again detects reuse
	_, _, _, err = store.RefreshSession(context.Background(), token, ttl)
	require.ErrorIs(t, err, ports.ErrRefreshReuse)
}

func TestRefreshSessionReuseRevokesWholeFamily(t *testing.T) {
	store := newTestStore()
	token, family, err := store.CreateRefreshSession(context.Background(), "user-1", ttl)
	require.NoError(t, err)

	// rotate once -> old token becomes spent
	user, _, secondToken, err := store.RefreshSession(context.Background(), token, ttl)
	require.NoError(t, err)
	assert.Equal(t, "user-1", user)

	// reuse the spent token -> family revoked
	_, _, _, err = store.RefreshSession(context.Background(), token, ttl)
	require.ErrorIs(t, err, ports.ErrRefreshReuse)

	// presenting the rotated-in token must now fail (family dead)
	_, _, _, err = store.RefreshSession(context.Background(), secondToken, ttl)
	require.Error(t, err)
	assert.NotEqual(t, ports.ErrRefreshReuse, err)

	// family removed from snapshot
	assert.NotContains(t, store.SnapshotFamilies(), family)
}

func TestRevokeSessionRevokesOnlyThatFamily(t *testing.T) {
	store := newTestStore()
	t1, f1, err := store.CreateRefreshSession(context.Background(), "user-1", ttl)
	require.NoError(t, err)
	t2, f2, err := store.CreateRefreshSession(context.Background(), "user-1", ttl)
	require.NoError(t, err)

	require.NoError(t, store.RevokeSession(context.Background(), t1))
	assert.NotContains(t, store.SnapshotFamilies(), f1)
	assert.Contains(t, store.SnapshotFamilies(), f2)

	// t2 still valid
	_, _, _, err = store.RefreshSession(context.Background(), t2, ttl)
	require.NoError(t, err)
}

func TestRevokeAllUserSessionsRevokesEveryFamily(t *testing.T) {
	store := newTestStore()
	for i := 0; i < 3; i++ {
		_, _, err := store.CreateRefreshSession(context.Background(), "user-1", ttl)
		require.NoError(t, err)
	}
	_, _, err := store.CreateRefreshSession(context.Background(), "user-2", ttl)
	require.NoError(t, err)

	require.NoError(t, store.RevokeAllUserSessions(context.Background(), "user-1"))
	assert.Empty(t, store.SnapshotFamiliesForUser("user-1"))
	assert.Len(t, store.SnapshotFamiliesForUser("user-2"), 1)
}

func TestMFAChallengeIsSingleUse(t *testing.T) {
	store := newTestStore()
	ticket := "ticket-abc"
	require.NoError(t, store.StoreMFAChallenge(context.Background(), ticket, "user-1", 5*time.Minute))

	userID, err := store.ConsumeMFAChallenge(context.Background(), ticket)
	require.NoError(t, err)
	assert.Equal(t, "user-1", userID)

	_, err = store.ConsumeMFAChallenge(context.Background(), ticket)
	assert.Error(t, err)
}

func TestMFAChallengeUnknownTicketRejected(t *testing.T) {
	store := newTestStore()
	_, err := store.ConsumeMFAChallenge(context.Background(), "does-not-exist")
	assert.Error(t, err)
}
