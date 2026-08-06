package http

import (
	"net/http"

	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	adminUseCase ports.AdminUseCase
}

func NewAdminHandler(adminUseCase ports.AdminUseCase) *AdminHandler {
	return &AdminHandler{
		adminUseCase: adminUseCase,
	}
}

type CreateUserByAdminRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name" binding:"required"`
	Role     string `json:"role" binding:"required"`
}

type AssignPersonsRequest struct {
	PersonIDs []string `json:"person_ids"`
}

func (handler *AdminHandler) ListUsers(ginContext *gin.Context) {
	usersWithPersons, err := handler.adminUseCase.ListUsersWithPersons(ginContext.Request.Context())
	if err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ginContext.JSON(http.StatusOK, gin.H{"users": usersWithPersons})
}

func (handler *AdminHandler) CreateUser(ginContext *gin.Context) {
	var requestPayload CreateUserByAdminRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newUser, err := handler.adminUseCase.CreateUser(
		ginContext.Request.Context(),
		requestPayload.Email,
		requestPayload.Password,
		requestPayload.FullName,
		requestPayload.Role,
	)

	if err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusCreated, gin.H{
		"message": "user created successfully by admin",
		"user":    newUser,
	})
}

func (handler *AdminHandler) AssignPersons(ginContext *gin.Context) {
	userID := ginContext.Param("id")
	var requestPayload AssignPersonsRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := handler.adminUseCase.AssignPersonsToUser(
		ginContext.Request.Context(),
		userID,
		requestPayload.PersonIDs,
	)

	if err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusOK, gin.H{
		"message": "person access permissions assigned successfully",
	})
}
