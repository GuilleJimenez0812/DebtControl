package errors

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	ErrInvalidEmail       = errors.New("invalid email address")
	ErrPasswordTooShort   = errors.New("password must be at least 8 characters")
	ErrUserAlreadyExists  = errors.New("user with this email already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrPersonNotFound     = errors.New("person not found")
	ErrInvalidAmount       = errors.New("amount must be greater than zero")
	ErrUnauthorized       = errors.New("unauthorized access")
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
	case errors.Is(domainErr, ErrInvalidEmail), errors.Is(domainErr, ErrPasswordTooShort), errors.Is(domainErr, ErrInvalidAmount):
		statusCode = http.StatusBadRequest
		errorCode = "BAD_REQUEST"

	case errors.Is(domainErr, ErrUserAlreadyExists):
		statusCode = http.StatusConflict
		errorCode = "USER_ALREADY_EXISTS"

	case errors.Is(domainErr, ErrInvalidCredentials), errors.Is(domainErr, ErrUnauthorized):
		statusCode = http.StatusUnauthorized
		errorCode = "UNAUTHORIZED"

	case errors.Is(domainErr, ErrPersonNotFound):
		statusCode = http.StatusNotFound
		errorCode = "PERSON_NOT_FOUND"

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
