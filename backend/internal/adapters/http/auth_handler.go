package http

import (
	"net/http"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-gonic/gin"
)

const (
	accessCookieName          = "access_token"
	refreshCookieName         = "refresh_token"
	accessCookieMaxAgeSeconds  = 15 * 60
	refreshCookieMaxAgeSeconds = 7 * 24 * 60 * 60
)

func setAuthCookies(ginContext *gin.Context, accessToken string, refreshToken string) {
	ginContext.SetSameSite(http.SameSiteStrictMode)
	ginContext.SetCookie(accessCookieName, accessToken, accessCookieMaxAgeSeconds, "/", "", false, true)
	ginContext.SetCookie(refreshCookieName, refreshToken, refreshCookieMaxAgeSeconds, "/", "", true, true)
	ginContext.SetSameSite(0)
}

func clearAuthCookies(ginContext *gin.Context) {
	ginContext.SetCookie(accessCookieName, "", -1, "/", "", false, true)
	ginContext.SetCookie(refreshCookieName, "", -1, "/", "", true, true)
}

func readRefreshCookie(ginContext *gin.Context) string {
	token, err := ginContext.Cookie(refreshCookieName)
	if err != nil {
		return ""
	}
	return token
}

type AuthHandler struct {
	authUseCase ports.AuthUseCase
}

func NewAuthHandler(authUseCase ports.AuthUseCase) *AuthHandler {
	return &AuthHandler{
		authUseCase: authUseCase,
	}
}

func (handler *AuthHandler) Register(ginContext *gin.Context) {
	var requestPayload RegisterRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := handler.authUseCase.Register(
		ginContext.Request.Context(),
		requestPayload.Email,
		requestPayload.Password,
		requestPayload.FullName,
	)

	if err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusCreated, gin.H{
		"message": "user registered successfully",
		"user":    user,
	})
}

func (handler *AuthHandler) Login(ginContext *gin.Context) {
	var requestPayload LoginRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	accessToken, refreshToken, user, err := handler.authUseCase.Login(ginContext.Request.Context(), requestPayload.Email, requestPayload.Password)
	if err != nil {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	setAuthCookies(ginContext, accessToken, refreshToken)

	ginContext.JSON(http.StatusOK, gin.H{
		"message": "login successful",
		"user":    user,
	})
}

func (handler *AuthHandler) Refresh(ginContext *gin.Context) {
	refreshToken := readRefreshCookie(ginContext)
	if refreshToken == "" {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "refresh token required"})
		return
	}

	accessToken, newRefreshToken, user, err := handler.authUseCase.Refresh(ginContext.Request.Context(), refreshToken)
	if err != nil {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired refresh token"})
		return
	}

	setAuthCookies(ginContext, accessToken, newRefreshToken)

	ginContext.JSON(http.StatusOK, gin.H{
		"message": "token refreshed",
		"user":    user,
	})
}

func (handler *AuthHandler) Logout(ginContext *gin.Context) {
	tokenID, hasTokenID := ginContext.Get("token_id")
	refreshToken := readRefreshCookie(ginContext)

	if hasTokenID {
		_ = handler.authUseCase.Logout(ginContext.Request.Context(), tokenID.(string), refreshToken)
	} else if refreshToken != "" {
		_ = handler.authUseCase.Logout(ginContext.Request.Context(), "", refreshToken)
	}

	clearAuthCookies(ginContext)

	ginContext.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}

func (handler *AuthHandler) LogoutEverywhere(ginContext *gin.Context) {
	currentUser, exists := ginContext.Get("user")
	if !exists {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized access"})
		return
	}
	userEntity := currentUser.(*domain.User)
	if err := handler.authUseCase.LogoutEverywhere(ginContext.Request.Context(), userEntity.ID); err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	clearAuthCookies(ginContext)

	ginContext.JSON(http.StatusOK, gin.H{"message": "all sessions revoked"})
}

func (handler *AuthHandler) GetCurrentUser(ginContext *gin.Context) {
	currentUser, exists := ginContext.Get("user")
	if !exists {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "user context not found"})
		return
	}

	userEntity := currentUser.(*domain.User)
	ginContext.JSON(http.StatusOK, gin.H{"user": userEntity})
}
