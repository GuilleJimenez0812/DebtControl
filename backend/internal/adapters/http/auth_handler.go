package http

import (
	"net/http"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-gonic/gin"
)

const (
	accessCookieName           = "access_token"
	refreshCookieName          = "refresh_token"
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
	authUseCase         ports.AuthUseCase
	registrationEnabled bool
}

func NewAuthHandler(authUseCase ports.AuthUseCase, registrationEnabled bool) *AuthHandler {
	return &AuthHandler{
		authUseCase:         authUseCase,
		registrationEnabled: registrationEnabled,
	}
}

func (handler *AuthHandler) RegistrationStatus(ginContext *gin.Context) {
	ginContext.JSON(http.StatusOK, gin.H{"registration_enabled": handler.registrationEnabled})
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

	loginResult, err := handler.authUseCase.Login(ginContext.Request.Context(), requestPayload.Email, requestPayload.Password)
	if err != nil {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// MFA gate: password was correct but the second factor is pending.
	if loginResult.MFAPendingLogin {
		ginContext.JSON(http.StatusOK, gin.H{
			"message":       "mfa required",
			"mfa_pending":   true,
			"mfa_ticket":    loginResult.MFATicket,
			"totp_required": true,
			"user":          loginResult.User,
		})
		return
	}

	setAuthCookies(ginContext, loginResult.AccessToken, loginResult.RefreshToken)

	ginContext.JSON(http.StatusOK, gin.H{
		"message": "login successful",
		"user":    loginResult.User,
	})
}

func (handler *AuthHandler) CompleteLoginWithTOTP(ginContext *gin.Context) {
	var requestPayload MFALoginRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	loginResult, err := handler.authUseCase.CompleteLoginWithTOTP(ginContext.Request.Context(), requestPayload.MFATicket, requestPayload.Code)
	if err != nil {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	setAuthCookies(ginContext, loginResult.AccessToken, loginResult.RefreshToken)

	ginContext.JSON(http.StatusOK, gin.H{
		"message": "login successful",
		"user":    loginResult.User,
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

func (handler *AuthHandler) GenerateTOTP(ginContext *gin.Context) {
	currentUser, exists := ginContext.Get("user")
	if !exists {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized access"})
		return
	}
	userEntity := currentUser.(*domain.User)

	secret, provisioningURI, err := handler.authUseCase.GenerateTOTP(ginContext.Request.Context(), userEntity.ID)
	if err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusOK, gin.H{
		"message":          "totp provisioned",
		"secret":           secret,
		"provisioning_uri": provisioningURI,
	})
}

func (handler *AuthHandler) EnableTOTP(ginContext *gin.Context) {
	var requestPayload TOTPCodeRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	currentUser, exists := ginContext.Get("user")
	if !exists {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized access"})
		return
	}
	userEntity := currentUser.(*domain.User)

	if err := handler.authUseCase.EnableTOTP(ginContext.Request.Context(), userEntity.ID, requestPayload.Code); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusOK, gin.H{"message": "totp enabled", "totp_enabled": true})
}

func (handler *AuthHandler) DisableTOTP(ginContext *gin.Context) {
	var requestPayload TOTPCodeRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	currentUser, exists := ginContext.Get("user")
	if !exists {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized access"})
		return
	}
	userEntity := currentUser.(*domain.User)

	if err := handler.authUseCase.DisableTOTP(ginContext.Request.Context(), userEntity.ID, requestPayload.Code); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusOK, gin.H{"message": "totp disabled", "totp_enabled": false})
}

func (handler *AuthHandler) GetTOTPStatus(ginContext *gin.Context) {
	currentUser, exists := ginContext.Get("user")
	if !exists {
		ginContext.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized access"})
		return
	}
	userEntity := currentUser.(*domain.User)

	enabled, err := handler.authUseCase.GetTOTPStatus(ginContext.Request.Context(), userEntity.ID)
	if err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusOK, gin.H{"totp_enabled": enabled})
}
