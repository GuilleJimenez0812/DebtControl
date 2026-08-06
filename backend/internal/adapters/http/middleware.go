package http

import (
	"net/http"
	"strings"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(authUseCase ports.AuthUseCase) gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		var tokenString string

		cookieToken, err := ginContext.Cookie("access_token")
		if err == nil && cookieToken != "" {
			tokenString = cookieToken
		} else {
			authHeader := ginContext.GetHeader("Authorization")
			if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
				tokenString = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if tokenString == "" {
			ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized access, authentication token required"})
			ginContext.Abort()
			return
		}

		user, tokenID, err := authUseCase.ValidateAccessToken(ginContext.Request.Context(), tokenString)
		if err != nil {
			ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired authentication token"})
			ginContext.Abort()
			return
		}

		ginContext.Set("user", user)
		ginContext.Set("token_id", tokenID)
		ginContext.Next()
	}
}

func RequireAdminRole() gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		currentUser, exists := ginContext.Get("user")
		if !exists {
			ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized access"})
			ginContext.Abort()
			return
		}

		userEntity := currentUser.(*domain.User)
		if userEntity.Role != domain.RoleAdmin {
			ginContext.JSON(http.StatusForbidden, gin.H{"error": "admin role privilege required"})
			ginContext.Abort()
			return
		}

		ginContext.Next()
	}
}

func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		ginContext.Header("X-Frame-Options", "DENY")
		ginContext.Header("X-Content-Type-Options", "nosniff")
		ginContext.Header("X-XSS-Protection", "1; mode=block")
		ginContext.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		ginContext.Next()
	}
}
