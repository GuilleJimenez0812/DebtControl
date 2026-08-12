package http

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

var (
	memCache      sync.Map
	idempotencyTTL = 24 * time.Hour
)

// cleanMemCache occasionally removes expired keys
func init() {
	go func() {
		for {
			time.Sleep(1 * time.Hour)
			now := time.Now()
			memCache.Range(func(key, value interface{}) bool {
				if expiry, ok := value.(time.Time); ok && now.After(expiry) {
					memCache.Delete(key)
				}
				return true
			})
		}
	}()
}

func IdempotencyMiddleware(redisClient *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		if method == http.MethodGet || method == http.MethodOptions || method == http.MethodHead {
			c.Next()
			return
		}

		idempotencyKey := c.GetHeader("X-Idempotency-Key")
		if idempotencyKey == "" {
			c.Next()
			return
		}

		cacheKey := "idempotency:" + idempotencyKey

		if redisClient != nil {
			ctx := context.Background()
			set, err := redisClient.SetNX(ctx, cacheKey, "processing", idempotencyTTL).Result()
			if err != nil {
				// If Redis fails, allow request to proceed (graceful degradation)
				c.Next()
				return
			}
			if !set {
				// Key already exists => duplicate request
				c.AbortWithStatusJSON(http.StatusConflict, gin.H{"error": "Duplicate request detected"})
				return
			}
		} else {
			// Fallback to in-memory cache
			expiryTime := time.Now().Add(idempotencyTTL)
			if _, loaded := memCache.LoadOrStore(cacheKey, expiryTime); loaded {
				c.AbortWithStatusJSON(http.StatusConflict, gin.H{"error": "Duplicate request detected"})
				return
			}
		}

		c.Next()
	}
}
