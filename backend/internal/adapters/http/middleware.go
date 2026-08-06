package http

import (
	"net/http"
	"strings"

	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-gonic/gin"
)

func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		ginContext.Header("X-Frame-Options", "DENY")
		ginContext.Header("X-Content-Type-Options", "nosniff")
		ginContext.Header("X-XSS-Protection", "1; mode=block")
		ginContext.Header("Content-Security-Policy", "default-src 'self'")
		ginContext.Next()
	}
}

func AuthMiddleware(authUseCase ports.AuthUseCase) gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		tokenString, err := ginContext.Cookie("access_token")
		if err != nil || tokenString == "" {
			authHeader := ginContext.GetHeader("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenString = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if tokenString == "" {
			ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized access, authentication token required"})
			ginContext.Abort()
			return
		}

		user, tokenID, err := authUseCase.ValidateAccessToken(ginContext.Request.Context(), tokenString)
		if err != nil || user == nil {
			ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			ginContext.Abort()
			return
		}

		ginContext.Set("user", user)
		ginContext.Set("token_id", tokenID)
		ginContext.Next()
	}
}
