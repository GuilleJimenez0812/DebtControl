package services

import (
	"context"
	"errors"
	"time"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"
	"debtcontrol/backend/pkg/security"

	"github.com/google/uuid"
)

var (
	ErrUserAlreadyExists = errors.New("user with this email already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
)

type AuthService struct {
	userRepo     ports.UserRepository
	sessionStore ports.SessionStore
	jwtSecret    string
}

func NewAuthService(userRepo ports.UserRepository, sessionStore ports.SessionStore, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:     userRepo,
		sessionStore: sessionStore,
		jwtSecret:    jwtSecret,
	}
}

func (service *AuthService) Register(ctx context.Context, email string, password string, fullName string) (*domain.User, error) {
	existingUser, _ := service.userRepo.FindByEmail(ctx, email)
	if existingUser != nil {
		return nil, ErrUserAlreadyExists
	}

	hashedPassword, err := security.HashPassword(password)
	if err != nil {
		return nil, err
	}

	assignedRole := domain.RoleUser
	allUsers, _ := service.userRepo.FindAll(ctx)
	if len(allUsers) == 0 {
		assignedRole = domain.RoleAdmin // First user registered in DB is automatically Admin
	}

	userID := uuid.New().String()
	newUser, err := domain.NewUser(userID, email, hashedPassword, fullName, assignedRole)
	if err != nil {
		return nil, err
	}

	err = service.userRepo.Create(ctx, newUser)
	if err != nil {
		return nil, err
	}

	return newUser, nil
}

func (service *AuthService) Login(ctx context.Context, email string, password string) (accessToken string, refreshToken string, user *domain.User, err error) {
	existingUser, err := service.userRepo.FindByEmail(ctx, email)
	if err != nil || existingUser == nil {
		return "", "", nil, ErrInvalidCredentials
	}

	err = security.ComparePassword(existingUser.PasswordHash, password)
	if err != nil {
		return "", "", nil, ErrInvalidCredentials
	}

	accessToken, tokenID, err := security.GenerateAccessToken(existingUser.ID, existingUser.Email, string(existingUser.Role), service.jwtSecret, 15*time.Minute)
	if err != nil {
		return "", "", nil, err
	}

	if service.sessionStore != nil {
		_ = service.sessionStore.StoreSession(ctx, existingUser.ID, tokenID, 15*time.Minute)
		refreshToken, _, _ = service.sessionStore.CreateRefreshSession(ctx, existingUser.ID, 7*24*time.Hour)
	}

	return accessToken, refreshToken, existingUser, nil
}

// Refresh validates the presented opaque refresh token, rotates it (remote family
// reuse protection) and issues a fresh access token.
func (service *AuthService) Refresh(ctx context.Context, presentedRefreshToken string) (accessToken string, newRefreshToken string, user *domain.User, err error) {
	if service.sessionStore == nil {
		return "", "", nil, errors.New("session store not configured")
	}

	userID, _, rotatedToken, err := service.sessionStore.RefreshSession(ctx, presentedRefreshToken, 7*24*time.Hour)
	if err != nil {
		if errors.Is(err, ports.ErrRefreshReuse) {
			return "", "", nil, ports.ErrRefreshReuse
		}
		return "", "", nil, ErrInvalidCredentials
	}

	resolvedUser, err := service.userRepo.FindByID(ctx, userID)
	if err != nil || resolvedUser == nil {
		return "", "", nil, ErrInvalidCredentials
	}

	accessToken, _, err = security.GenerateAccessToken(resolvedUser.ID, resolvedUser.Email, string(resolvedUser.Role), service.jwtSecret, 15*time.Minute)
	if err != nil {
		return "", "", nil, err
	}

	return accessToken, rotatedToken, resolvedUser, nil
}

func (service *AuthService) Logout(ctx context.Context, tokenID string, refreshToken string) error {
	if service.sessionStore != nil {
		if tokenID != "" {
			_ = service.sessionStore.InvalidateSession(ctx, tokenID, 24*time.Hour)
		}
		if refreshToken != "" {
			_ = service.sessionStore.RevokeSession(ctx, refreshToken)
		}
	}
	return nil
}

func (service *AuthService) LogoutEverywhere(ctx context.Context, userID string) error {
	if service.sessionStore != nil {
		return service.sessionStore.RevokeAllUserSessions(ctx, userID)
	}
	return nil
}

func (service *AuthService) ValidateAccessToken(ctx context.Context, tokenString string) (*domain.User, string, error) {
	claims, err := security.ValidateToken(tokenString, service.jwtSecret)
	if err != nil {
		return nil, "", err
	}

	if service.sessionStore != nil {
		blacklisted, err := service.sessionStore.IsSessionBlacklisted(ctx, claims.TokenID)
		if err == nil && blacklisted {
			return nil, "", security.ErrInvalidToken
		}
	}

	user, err := service.userRepo.FindByID(ctx, claims.UserID)
	if err != nil || user == nil {
		return nil, "", security.ErrInvalidToken
	}

	return user, claims.TokenID, nil
}
