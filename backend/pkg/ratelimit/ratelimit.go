package ratelimit

import (
	"context"
	"errors"
	"log"
	"strconv"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Store is a counter backend keyed by an opaque bucket key. A fixed-window
// approach is used: the caller keys by window start, so counts self-reset when
// the bucket rolls over. Implementations must be concurrency-safe.
type Store interface {
	// IncrementAndGet increments the counter for key and returns the new count
	// and how long until the bucket storing it resets.
	IncrementAndGet(ctx context.Context, key string, window time.Duration) (count uint64, resetIn time.Duration, err error)
}

// MemoryStore is a process-local fallback. Limits reset when the process
// restarts (Redis-down or memory-only deployments) and on window rollover.
type MemoryStore struct {
	mu       sync.Mutex
	counters map[string]memoryCounter
}

type memoryCounter struct {
	count uint64
	reset time.Time
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{counters: make(map[string]memoryCounter)}
}

func (store *MemoryStore) IncrementAndGet(ctx context.Context, key string, window time.Duration) (uint64, time.Duration, error) {
	store.mu.Lock()
	defer store.mu.Unlock()

	now := time.Now()
	entry, exists := store.counters[key]
	if !exists || now.After(entry.reset) {
		entry = memoryCounter{count: 0, reset: now.Add(window)}
	}
	entry.count++
	store.counters[key] = entry

	return entry.count, time.Until(entry.reset), nil
}

// RedisStore backs counters with Redis INCR+EXPIRE (atomic under a pipeline),
// so counters survive across instances and are only lost on Redis restart.
type RedisStore struct {
	client *redis.Client
}

func NewRedisStore(client *redis.Client) *RedisStore {
	return &RedisStore{client: client}
}

func (store *RedisStore) IncrementAndGet(ctx context.Context, key string, window time.Duration) (uint64, time.Duration, error) {
	pipe := store.client.TxPipeline()
	countCmd := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, window)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, 0, err
	}
	value := countCmd.Val()
	if value < 0 {
		return 0, 0, errors.New("ratelimit: negative counter")
	}
	return uint64(value), window, nil
}

// Policy describes a single limiting rule: how many attempts are allowed in a
// window before the client is rejected.
type Policy struct {
	Limit  uint64
	Window time.Duration
}

// Limiter evaluates zero-or-more policies against a bucket key. A request is
// allowed only if every policy is under its limit.
type Limiter struct {
	store Store
}

func NewLimiter(store Store) *Limiter {
	return &Limiter{store: store}
}

// Allow advances every policy for the key. It returns whether the request may
// proceed and, when throttled, how long the client must wait (the longest
// pending reset among the exceeded policies).
func (limiter *Limiter) Allow(ctx context.Context, key string, policies []Policy) (bool, time.Duration) {
	if len(policies) == 0 {
		return true, 0
	}

	// Only advance the clock once per request even when both an IP and an
	// account policy share a key; each policy gets its own counter key.
	longestReset := time.Duration(0)
	for _, policy := range policies {
		counterKey := key + ":" + strconv.FormatInt(int64(policy.Window/time.Second), 10)
		count, resetIn, err := limiter.store.IncrementAndGet(ctx, counterKey, policy.Window)
		if err != nil {
			log.Printf("ratelimit: %v", err)
			continue // fail-open so a broken store never locks users out of their account
		}
		if count > policy.Limit {
			if resetIn > longestReset {
				longestReset = resetIn
			}
		}
	}
	return longestReset == 0, longestReset
}

var ErrStoreNotConfigured = errors.New("rate limit store not configured")
