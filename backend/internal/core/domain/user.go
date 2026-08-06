package domain

import (
	"errors"
	"time"
)

var (
	ErrInvalidEmail    = errors.New("invalid email address")
	ErrPasswordTooShort = errors.New("password must be at least 8 characters")
)

type UserRole string

const (
	RoleAdmin UserRole = "admin"
	RoleUser  UserRole = "user"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	Role         UserRole  `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func NewUser(id string, email string, passwordHash string, fullName string, role UserRole) (*User, error) {
	if email == "" {
		return nil, ErrInvalidEmail
	}
	if len(passwordHash) == 0 {
		return nil, errors.New("password hash cannot be empty")
	}

	currentTime := time.Now()
	return &User{
		ID:           id,
		Email:        email,
		PasswordHash: passwordHash,
		FullName:     fullName,
		Role:         role,
		CreatedAt:    currentTime,
		UpdatedAt:    currentTime,
	}, nil
}
