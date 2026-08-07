package http

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"net/http"
	"strings"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-gonic/gin"
)

const csrfCookieName = "csrf_token"
const csrfHeaderName = "X-CSRF-Token"

// GenerateCSRFToken returns a fresh random token to be placed in a cookie.
func GenerateCSRFToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

// CSRFMiddleware protects state-changing requests with a double-submit token:
// a non-HttpOnly `csrf_token` cookie plus a matching `X-CSRF-Token` header.
// Cookies are already SameSite=Strict + HttpOnly; this is the belt-and-suspenders
// layer. When `latch` is true (auth bootstrap) a missing cookie is generated and
// set so the client can echo it subsequently; protected groups (`latch=false`)
// reject anything without an already-issued cookie.
func CSRFMiddleware(latch bool) gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		if !isStateChanging(ginContext.Request.Method) {
			ginContext.Next()
			return
		}

		cookieToken, cookieErr := ginContext.Cookie(csrfCookieName)
		headerToken := ginContext.GetHeader(csrfHeaderName)

		if cookieErr != nil {
			if !latch {
				ginContext.JSON(http.StatusForbidden, gin.H{"error": "CSRF token missing"})
				ginContext.Abort()
				return
			}
			// Bootstrap: issue a fresh token so the mutation can proceed and the
			// client can latch it for subsequent requests.
			token, err := GenerateCSRFToken()
			if err != nil {
				ginContext.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate CSRF token"})
				ginContext.Abort()
				return
			}
			ginContext.SetCookie(csrfCookieName, token, 24*60*60, "/", "", false, false)
			ginContext.Next()
			return
		}

		if headerToken == "" ||
			subtle.ConstantTimeCompare([]byte(cookieToken), []byte(headerToken)) != 1 {
			ginContext.JSON(http.StatusForbidden, gin.H{"error": "CSRF token mismatch or missing"})
			ginContext.Abort()
			return
		}

		ginContext.Next()
	}
}

func isStateChanging(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	}
	return false
}

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
