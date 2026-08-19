package domain

import (
	"errors"
	"time"
)

var (
	ErrInvalidEmail      = errors.New("invalid email address")
	ErrUserAlreadyExists = errors.New("user with this email already exists")
	ErrUserNotFound      = errors.New("user not found")
)

type Role = UserRole
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
	TOTPSecret   string    `json:"-"`
	TOTPEnabled  bool      `json:"totp_enabled"`
	Modules      []string  `json:"modules"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (user *User) EnableTOTP() {
	user.TOTPEnabled = true
	user.UpdatedAt = time.Now()
}

func (user *User) DisableTOTP() {
	user.TOTPEnabled = false
	user.TOTPSecret = ""
	user.UpdatedAt = time.Now()
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
		Modules:      []string{},
		CreatedAt:    currentTime,
		UpdatedAt:    currentTime,
	}, nil
}
