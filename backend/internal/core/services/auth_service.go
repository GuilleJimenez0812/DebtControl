package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"
	"debtcontrol/backend/pkg/security"

	"github.com/google/uuid"
)

var (
	ErrUserAlreadyExists  = errors.New("user with this email already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrTOTPNotProvisioned = errors.New("TOTP not provisioned")
	ErrInvalidTOTPCode    = errors.New("invalid TOTP code")
	ErrResetCodeExhausted = errors.New("verification code exhausted or expired")
	ErrInvalidResetCode   = errors.New("invalid verification code")
	ErrResetTicketExpired = errors.New("password reset session expired, please start over")
)

const (
	passwordResetCodeTTL         = 10 * time.Minute
	passwordResetCodeMaxAttempts = 5
	passwordResetTicketTTL       = 10 * time.Minute
)

func generateOpaqueTicket() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

// generateSixDigitCode returns a cryptographically random 6-digit code
// (000000-999999) for email OTPs.
func generateSixDigitCode() (string, error) {
	// Take 20 random bits and reject values above 1,000,000 for a uniform
	// distribution over 000000-999999.
	var result int
	for {
		buf := make([]byte, 3)
		if _, err := rand.Read(buf); err != nil {
			return "", err
		}
		candidate := (int(buf[0]) << 16) | (int(buf[1]) << 8) | int(buf[2])
		if candidate < 1000000 {
			result = candidate
			break
		}
	}
	return fmt.Sprintf("%06d", result), nil
}

type AuthService struct {
	userRepo     ports.UserRepository
	sessionStore ports.SessionStore
	emailSender  ports.EmailSender
	jwtSecret    string
}

func NewAuthService(userRepo ports.UserRepository, sessionStore ports.SessionStore, emailSender ports.EmailSender, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:     userRepo,
		sessionStore: sessionStore,
		emailSender:  emailSender,
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

func (service *AuthService) Login(ctx context.Context, email string, password string) (*ports.LoginResult, error) {
	existingUser, err := service.userRepo.FindByEmail(ctx, email)
	if err != nil || existingUser == nil {
		return nil, ErrInvalidCredentials
	}

	err = security.ComparePassword(existingUser.PasswordHash, password)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	result := &ports.LoginResult{User: existingUser}

	// MFA gate: verify the password, but only issue tokens after the user
	// proves possession of their authenticator with a TOTP code.
	if existingUser.TOTPEnabled {
		ticket, err := generateOpaqueTicket()
		if err != nil {
			return nil, err
		}
		if service.sessionStore != nil {
			if err := service.sessionStore.StoreMFAChallenge(ctx, ticket, existingUser.ID, 5*time.Minute); err != nil {
				return nil, err
			}
		}
		result.MFAPendingLogin = true
		result.MFATicket = ticket
		return result, nil
	}

	return result, service.issueSession(ctx, result, existingUser)
}

// CompleteLoginWithTOTP redeems the single-use MFA ticket from a successful
// password check and, once the presented TOTP code is valid, issues the real
// session.
// ChangePassword verifies the caller's current password, applies the shared
// password policy to the new one, persists the new bcrypt hash, and revokes
// every other session of the user (best practice after a credential change).
func (service *AuthService) ChangePassword(ctx context.Context, userID string, currentPassword string, newPassword string) error {
	user, err := service.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return ErrUserNotFound
	}

	if err := security.ComparePassword(user.PasswordHash, currentPassword); err != nil {
		return ErrInvalidCredentials
	}

	if err := security.ValidatePasswordPolicy(newPassword); err != nil {
		return err
	}

	newHash, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}

	user.PasswordHash = newHash
	user.UpdatedAt = time.Now()
	if err := service.userRepo.Update(ctx, user); err != nil {
		return err
	}

	if service.sessionStore != nil {
		_ = service.sessionStore.RevokeAllUserSessions(ctx, userID)
	}
	return nil
}

// RequestPasswordReset generates a short-lived single-use 6-digit code, stores
// it keyed by email, and emails it. It never reveals whether an account exists
// (anti-enumeration): unknown emails still succeed without sending.
func (service *AuthService) RequestPasswordReset(ctx context.Context, email string) error {
	user, err := service.userRepo.FindByEmail(ctx, email)
	if err != nil || user == nil {
		return nil // never leak account existence
	}

	code, err := generateSixDigitCode()
	if err != nil {
		return err
	}

	if service.sessionStore != nil {
		if err := service.sessionStore.StorePasswordResetOTP(ctx, email, code, passwordResetCodeMaxAttempts, passwordResetCodeTTL); err != nil {
			return err
		}
	}

	if service.emailSender != nil {
		return service.emailSender.SendPasswordResetOTP(ctx, email, code)
	}
	return nil
}

// VerifyPasswordResetOTP checks the presented code in constant time. On
// success it exchanges the verified code for a single-use reset ticket.
func (service *AuthService) VerifyPasswordResetOTP(ctx context.Context, email string, presentedCode string) (string, error) {
	if service.sessionStore == nil {
		return "", ErrResetCodeExhausted
	}
	valid, err := service.sessionStore.VerifyPasswordResetOTP(ctx, email, presentedCode)
	if err != nil {
		return "", ErrResetCodeExhausted
	}
	if !valid {
		return "", ErrInvalidResetCode
	}

	ticket, err := generateOpaqueTicket()
	if err != nil {
		return "", err
	}
	if err := service.sessionStore.StorePasswordResetTicket(ctx, ticket, email, passwordResetTicketTTL); err != nil {
		return "", err
	}
	return ticket, nil
}

// ResetPassword completes the flow: redeems the single-use ticket, applies the
// password policy, persists the new bcrypt hash, and revokes all sessions.
func (service *AuthService) ResetPassword(ctx context.Context, ticket string, newPassword string) error {
	if service.sessionStore == nil {
		return ErrResetTicketExpired
	}
	email, err := service.sessionStore.ConsumePasswordResetTicket(ctx, ticket)
	if err != nil {
		return ErrResetTicketExpired
	}

	user, err := service.userRepo.FindByEmail(ctx, email)
	if err != nil || user == nil {
		return ErrUserNotFound
	}

	if err := security.ValidatePasswordPolicy(newPassword); err != nil {
		return err
	}

	newHash, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}

	user.PasswordHash = newHash
	user.UpdatedAt = time.Now()
	if err := service.userRepo.Update(ctx, user); err != nil {
		return err
	}

	if service.sessionStore != nil {
		_ = service.sessionStore.RevokeAllUserSessions(ctx, user.ID)
	}
	return nil
}

func (service *AuthService) CompleteLoginWithTOTP(ctx context.Context, ticket string, presentedCode string) (*ports.LoginResult, error) {
	if service.sessionStore == nil {
		return nil, errors.New("session store not configured")
	}

	userID, err := service.sessionStore.ConsumeMFAChallenge(ctx, ticket)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	existingUser, err := service.userRepo.FindByID(ctx, userID)
	if err != nil || existingUser == nil {
		return nil, ErrInvalidCredentials
	}
	if !existingUser.TOTPEnabled || !security.ValidateTOTP(existingUser.TOTPSecret, presentedCode) {
		return nil, ErrInvalidCredentials
	}

	result := &ports.LoginResult{User: existingUser}
	return result, service.issueSession(ctx, result, existingUser)
}

func (service *AuthService) issueSession(ctx context.Context, result *ports.LoginResult, user *domain.User) error {
	accessToken, tokenID, err := security.GenerateAccessToken(user.ID, user.Email, string(user.Role), service.jwtSecret, 15*time.Minute)
	if err != nil {
		return err
	}

	if service.sessionStore != nil {
		_ = service.sessionStore.StoreSession(ctx, user.ID, tokenID, 15*time.Minute)
		refreshToken, _, _ := service.sessionStore.CreateRefreshSession(ctx, user.ID, 7*24*time.Hour)
		result.RefreshToken = refreshToken
	}
	result.AccessToken = accessToken
	return nil
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

func (service *AuthService) GetTOTPStatus(ctx context.Context, userID string) (bool, error) {
	user, err := service.userRepo.FindByID(ctx, userID)
	if err != nil {
		return false, err
	}
	if user == nil {
		return false, ErrUserNotFound
	}
	return user.TOTPEnabled, nil
}

// GenerateTOTP creates a fresh secret and stores it (encrypted at rest) so the
// user can scan the QR. The secret only takes effect once a valid code proves
// possession; until then the account keeps working without MFA.
func (service *AuthService) GenerateTOTP(ctx context.Context, userID string) (string, string, error) {
	user, err := service.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return "", "", ErrUserNotFound
	}

	secret, provisioningURI, err := security.GenerateTOTPSecret("DebtControl", user.Email)
	if err != nil {
		return "", "", err
	}

	user.TOTPSecret = secret
	if err := service.userRepo.Update(ctx, user); err != nil {
		return "", "", err
	}

	return secret, provisioningURI, nil
}

func (service *AuthService) EnableTOTP(ctx context.Context, userID string, presentedCode string) error {
	user, err := service.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return ErrUserNotFound
	}
	if user.TOTPSecret == "" {
		return ErrTOTPNotProvisioned
	}
	if !security.ValidateTOTP(user.TOTPSecret, presentedCode) {
		return ErrInvalidTOTPCode
	}

	user.EnableTOTP()
	return service.userRepo.Update(ctx, user)
}

func (service *AuthService) DisableTOTP(ctx context.Context, userID string, presentedCode string) error {
	user, err := service.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return ErrUserNotFound
	}
	if !security.ValidateTOTP(user.TOTPSecret, presentedCode) {
		return ErrInvalidTOTPCode
	}

	user.DisableTOTP()
	return service.userRepo.Update(ctx, user)
}
