package redis

import (
	"context"
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
	sessionKey := "session:" + tokenID
	return repository.redisClient.Set(ctx, sessionKey, userID, expiration).Err()
}

func (repository *SessionRepository) IsSessionBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	blacklistKey := "blacklist:" + tokenID
	result, err := repository.redisClient.Exists(ctx, blacklistKey).Result()
	if err != nil {
		return false, err
	}
	return result > 0, nil
}

func (repository *SessionRepository) InvalidateSession(ctx context.Context, tokenID string, expiration time.Duration) error {
	blacklistKey := "blacklist:" + tokenID
	sessionKey := "session:" + tokenID
	_ = repository.redisClient.Del(ctx, sessionKey).Err()
	return repository.redisClient.Set(ctx, blacklistKey, "revoked", expiration).Err()
}
