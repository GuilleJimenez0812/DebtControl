package errors

import (
	"errors"
	"net/http"
	"time"

	"debtcontrol/backend/internal/core/domain"

	"github.com/gin-gonic/gin"
)

type APIErrorResponse struct {
	Code      string    `json:"code"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

func MapDomainErrorToHTTP(ginContext *gin.Context, domainErr error) {
	if domainErr == nil {
		return
	}

	var statusCode int
	var errorCode string

	switch {
	case errors.Is(domainErr, domain.ErrInvalidAmount):
		statusCode = http.StatusBadRequest
		errorCode = "BAD_REQUEST"

	case errors.Is(domainErr, domain.ErrPersonNotFound):
		statusCode = http.StatusNotFound
		errorCode = "PERSON_NOT_FOUND"

	case errors.Is(domainErr, domain.ErrPurchaseItemNotFound):
		statusCode = http.StatusNotFound
		errorCode = "PURCHASE_ITEM_NOT_FOUND"

	case errors.Is(domainErr, domain.ErrPackageNotFound):
		statusCode = http.StatusNotFound
		errorCode = "PACKAGE_NOT_FOUND"

	default:
		statusCode = http.StatusInternalServerError
		errorCode = "INTERNAL_SERVER_ERROR"
	}

	ginContext.JSON(statusCode, APIErrorResponse{
		Code:      errorCode,
		Message:   domainErr.Error(),
		Timestamp: time.Now(),
	})
}
