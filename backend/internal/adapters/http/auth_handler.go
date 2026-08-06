package http

import (
	"net/http"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-gonic/gin"
)

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

	ginContext.SetCookie("access_token", accessToken, 900, "/", "", false, true)
	ginContext.SetCookie("refresh_token", refreshToken, 604800, "/", "", false, true)

	ginContext.JSON(http.StatusOK, gin.H{
		"message":      "login successful",
		"user":         user,
		"access_token": accessToken,
	})
}

func (handler *AuthHandler) Logout(ginContext *gin.Context) {
	tokenID, exists := ginContext.Get("token_id")
	if exists {
		_ = handler.authUseCase.Logout(ginContext.Request.Context(), tokenID.(string))
	}

	ginContext.SetCookie("access_token", "", -1, "/", "", false, true)
	ginContext.SetCookie("refresh_token", "", -1, "/", "", false, true)

	ginContext.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
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
