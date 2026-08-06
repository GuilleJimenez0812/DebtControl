package redis

import (
	"context"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type SessionRepository struct {
	redisClient *redis.Client
}

func NewSessionRepository(redisClient *redis.Client) *SessionRepository {
	return &SessionRepository{
		redisClient: redisClient,
	}
}

func (repository *SessionRepository) StoreSession(ctx context.Context, userID string, tokenID string, expiration time.Duration) error {
	if repository.redisClient == nil {
		return nil
	}
	sessionKey := "session:" + tokenID
	return repository.redisClient.Set(ctx, sessionKey, userID, expiration).Err()
}

func (repository *SessionRepository) IsSessionBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	if repository.redisClient == nil {
		return false, nil
	}
	blacklistKey := "blacklist:" + tokenID
	result, err := repository.redisClient.Exists(ctx, blacklistKey).Result()
	if err != nil {
		return false, nil
	}
	return result > 0, nil
}

func (repository *SessionRepository) InvalidateSession(ctx context.Context, tokenID string, expiration time.Duration) error {
	if repository.redisClient == nil {
		return nil
	}
	blacklistKey := "blacklist:" + tokenID
	sessionKey := "session:" + tokenID
	_ = repository.redisClient.Del(ctx, sessionKey).Err()
	return repository.redisClient.Set(ctx, blacklistKey, "revoked", expiration).Err()
}

type MemorySessionRepository struct {
	mu        sync.RWMutex
	blacklist map[string]time.Time
}

func NewMemorySessionRepository() *MemorySessionRepository {
	return &MemorySessionRepository{
		blacklist: make(map[string]time.Time),
	}
}

func (repo *MemorySessionRepository) StoreSession(ctx context.Context, userID string, tokenID string, expiration time.Duration) error {
	return nil
}

func (repo *MemorySessionRepository) IsSessionBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	exp, exists := repo.blacklist[tokenID]
	if !exists {
		return false, nil
	}
	if time.Now().After(exp) {
		return false, nil
	}
	return true, nil
}

func (repo *MemorySessionRepository) InvalidateSession(ctx context.Context, tokenID string, expiration time.Duration) error {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	repo.blacklist[tokenID] = time.Now().Add(expiration)
	return nil
}
