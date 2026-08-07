package services_test

import (
	"context"
	"testing"
	"time"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/services"
	"debtcontrol/backend/pkg/security"

	"github.com/pquerna/otp/totp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testJWTSecret = "test-jwt-secret-with-enough-characters-2026"

type fakeUserRepo struct {
	byEmail map[string]*domain.User
	byID    map[string]*domain.User
}

func newFakeUserRepo() *fakeUserRepo {
	return &fakeUserRepo{byEmail: make(map[string]*domain.User), byID: make(map[string]*domain.User)}
}

func (r *fakeUserRepo) Create(ctx context.Context, u *domain.User) error {
	r.byEmail[u.Email] = u
	r.byID[u.ID] = u
	return nil
}
func (r *fakeUserRepo) Update(ctx context.Context, u *domain.User) error {
	r.byEmail[u.Email] = u
	r.byID[u.ID] = u
	return nil
}
func (r *fakeUserRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	return r.byEmail[email], nil
}
func (r *fakeUserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	return r.byID[id], nil
}
func (r *fakeUserRepo) FindAll(ctx context.Context) ([]*domain.User, error) { return nil, nil }
func (r *fakeUserRepo) EnsureFirstUserIsAdmin(ctx context.Context) error    { return nil }
func (r *fakeUserRepo) AssignPersonsToUser(ctx context.Context, u string, p []string) error {
	return nil
}
func (r *fakeUserRepo) GetAssignedPersonIDs(ctx context.Context, u string) ([]string, error) {
	return nil, nil
}

type fakeAuthSession struct {
	spent       map[string]bool
	current     map[string]string // familyID -> current token
	userByToken map[string]string
	revokedAll  map[string]bool
	revokedTok  map[string]bool
}

func newFakeAuthSession() *fakeAuthSession {
	return &fakeAuthSession{
		spent:       make(map[string]bool),
		current:     make(map[string]string),
		userByToken: make(map[string]string),
		revokedAll:  make(map[string]bool),
		revokedTok:  make(map[string]bool),
	}
}

func (s *fakeAuthSession) StoreSession(ctx context.Context, userID, tokenID string, exp time.Duration) error {
	return nil
}
func (s *fakeAuthSession) IsSessionBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	return false, nil
}
func (s *fakeAuthSession) InvalidateSession(ctx context.Context, tokenID string, exp time.Duration) error {
	return nil
}

func (s *fakeAuthSession) CreateRefreshSession(ctx context.Context, userID string, exp time.Duration) (string, string, error) {
	tk := "refresh-" + userID + "-" + itoa(len(s.userByToken))
	family := "family-" + userID
	s.current[family] = tk
	s.userByToken[tk] = userID
	return tk, family, nil
}

func (s *fakeAuthSession) RefreshSession(ctx context.Context, presented string, exp time.Duration) (string, string, string, error) {
	userID, ok := s.userByToken[presented]
	if !ok {
		return "", "", "", errInvalidRefreshToken
	}
	if s.spent[presented] {
		return "", "", "", errRefreshReuse
	}
	delete(s.userByToken, presented)
	s.spent[presented] = true
	newToken := presented + "-rotated"
	s.userByToken[newToken] = userID
	return userID, "family-" + userID, newToken, nil
}

func (s *fakeAuthSession) RevokeSession(ctx context.Context, presented string) error {
	s.revokedTok[presented] = true
	return nil
}

func (s *fakeAuthSession) RevokeAllUserSessions(ctx context.Context, userID string) error {
	s.revokedAll[userID] = true
	return nil
}

func (s *fakeAuthSession) StoreMFAChallenge(ctx context.Context, ticket, userID string, exp time.Duration) error {
	s.userByToken[ticket] = userID
	return nil
}

func (s *fakeAuthSession) ConsumeMFAChallenge(ctx context.Context, ticket string) (string, error) {
	userID, ok := s.userByToken[ticket]
	if !ok {
		return "", errInvalidRefreshToken
	}
	delete(s.userByToken, ticket)
	return userID, nil
}

func itoa(n int) string {
	return string(rune('a' + n%26))
}

var (
	errInvalidRefreshToken = &testErr{"invalid refresh token"}
	errRefreshReuse        = &testErr{"refresh token reuse detected, session revoked"}
)

type testErr struct{ msg string }

func (e *testErr) Error() string { return e.msg }

func newTestAuthService() (*services.AuthService, *fakeUserRepo, *fakeAuthSession) {
	repo := newFakeUserRepo()
	sessions := newFakeAuthSession()
	svc := services.NewAuthService(repo, sessions, testJWTSecret)
	return svc, repo, sessions
}

func mustCreateUser(t *testing.T, repo *fakeUserRepo, id, email, password string) *domain.User {
	t.Helper()
	hash, err := security.HashPassword(password)
	require.NoError(t, err)
	user, err := domain.NewUser(id, email, hash, "Test User", domain.RoleUser)
	require.NoError(t, err)
	require.NoError(t, repo.Create(context.Background(), user))
	return user
}

func TestLoginReturnsAccessAndRefreshToken(t *testing.T) {
	svc, repo, _ := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "a@b.com", "correct-password")

	result, err := svc.Login(context.Background(), "a@b.com", "correct-password")
	require.NoError(t, err)
	assert.NotEmpty(t, result.AccessToken)
	assert.NotEmpty(t, result.RefreshToken)
	assert.Equal(t, "user-1", result.User.ID)
	assert.False(t, result.MFAPendingLogin)

	claims, err := security.ValidateToken(result.AccessToken, testJWTSecret)
	require.NoError(t, err)
	assert.Equal(t, "user-1", claims.UserID)
}

func TestLoginWithoutTOTPEnabledIssuesTokensDirectly(t *testing.T) {
	svc, repo, _ := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "a@b.com", "correct-password")

	result, err := svc.Login(context.Background(), "a@b.com", "correct-password")
	require.NoError(t, err)
	assert.False(t, result.MFAPendingLogin)
	assert.NotEmpty(t, result.AccessToken)
	assert.NotEmpty(t, result.RefreshToken)
}

func TestRefreshRotatesRefreshTokenAndReturnsNewAccess(t *testing.T) {
	svc, repo, _ := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "a@b.com", "correct-password")
	initialResult, err := svc.Login(context.Background(), "a@b.com", "correct-password")
	require.NoError(t, err)

	access, newRefresh, user, err := svc.Refresh(context.Background(), initialResult.RefreshToken)
	require.NoError(t, err)
	assert.NotEmpty(t, access)
	assert.NotEmpty(t, newRefresh)
	assert.Equal(t, "user-1", user.ID)
	assert.NotEqual(t, initialResult.RefreshToken, newRefresh)
}

func TestLogoutEverywhereRevokesAllSessions(t *testing.T) {
	svc, repo, sessions := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "a@b.com", "correct-password")
	_, err := svc.Login(context.Background(), "a@b.com", "correct-password")
	require.NoError(t, err)

	require.NoError(t, svc.LogoutEverywhere(context.Background(), "user-1"))
	assert.True(t, sessions.revokedAll["user-1"])
}

func TestLogoutRevokesCurrentRefreshSession(t *testing.T) {
	svc, repo, sessions := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "a@b.com", "correct-password")
	result, err := svc.Login(context.Background(), "a@b.com", "correct-password")
	require.NoError(t, err)

	require.NoError(t, svc.Logout(context.Background(), "token-id", result.RefreshToken))
	assert.True(t, sessions.revokedTok[result.RefreshToken])
}

func validTOTPCode(t *testing.T, secret string) string {
	t.Helper()
	code, err := totp.GenerateCode(secret, time.Now().UTC())
	require.NoError(t, err)
	return code
}

func TestGenerateTOTPStoresSecret(t *testing.T) {
	svc, repo, _ := newTestAuthService()
	user := mustCreateUser(t, repo, "user-1", "mfa@b.com", "correct-password")
	require.False(t, user.TOTPEnabled)

	secret, provisioningURI, err := svc.GenerateTOTP(context.Background(), "user-1")
	require.NoError(t, err)
	assert.NotEmpty(t, secret)
	assert.Contains(t, provisioningURI, "otpauth://totp/")

	stored, _ := repo.FindByID(context.Background(), "user-1")
	assert.Equal(t, secret, stored.TOTPSecret)
	assert.False(t, stored.TOTPEnabled)
}

func TestEnableTOTPRequiresValidCode(t *testing.T) {
	svc, repo, _ := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "mfa@b.com", "correct-password")
	secret, _, err := svc.GenerateTOTP(context.Background(), "user-1")
	require.NoError(t, err)

	err = svc.EnableTOTP(context.Background(), "user-1", "000000")
	assert.Error(t, err)

	err = svc.EnableTOTP(context.Background(), "user-1", validTOTPCode(t, secret))
	require.NoError(t, err)

	stored, _ := repo.FindByID(context.Background(), "user-1")
	assert.True(t, stored.TOTPEnabled)
}

func TestLoginWithTOTPRequiresSecondFactor(t *testing.T) {
	svc, repo, _ := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "mfa@b.com", "correct-password")
	secret, _, err := svc.GenerateTOTP(context.Background(), "user-1")
	require.NoError(t, err)
	require.NoError(t, svc.EnableTOTP(context.Background(), "user-1", validTOTPCode(t, secret)))

	result, err := svc.Login(context.Background(), "mfa@b.com", "correct-password")
	require.NoError(t, err)
	assert.True(t, result.MFAPendingLogin)
	assert.NotEmpty(t, result.MFATicket)
	assert.Empty(t, result.AccessToken)
	assert.Empty(t, result.RefreshToken)
}

func TestCompleteLoginWithValidTOTPCodeIssuesTokens(t *testing.T) {
	svc, repo, _ := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "mfa@b.com", "correct-password")
	secret, _, err := svc.GenerateTOTP(context.Background(), "user-1")
	require.NoError(t, err)
	require.NoError(t, svc.EnableTOTP(context.Background(), "user-1", validTOTPCode(t, secret)))

	pending, err := svc.Login(context.Background(), "mfa@b.com", "correct-password")
	require.NoError(t, err)
	require.True(t, pending.MFAPendingLogin)

	completed, err := svc.CompleteLoginWithTOTP(context.Background(), pending.MFATicket, validTOTPCode(t, secret))
	require.NoError(t, err)
	assert.NotEmpty(t, completed.AccessToken)
	assert.NotEmpty(t, completed.RefreshToken)
	assert.Equal(t, "user-1", completed.User.ID)
}

func TestCompleteLoginWithBadTOTPCodeRejected(t *testing.T) {
	svc, repo, _ := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "mfa@b.com", "correct-password")
	secret, _, err := svc.GenerateTOTP(context.Background(), "user-1")
	require.NoError(t, err)
	require.NoError(t, svc.EnableTOTP(context.Background(), "user-1", validTOTPCode(t, secret)))

	pending, err := svc.Login(context.Background(), "mfa@b.com", "correct-password")
	require.NoError(t, err)

	_, err = svc.CompleteLoginWithTOTP(context.Background(), pending.MFATicket, "000000")
	assert.Error(t, err)
}

func TestCompleteLoginTicketIsSingleUse(t *testing.T) {
	svc, repo, _ := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "mfa@b.com", "correct-password")
	secret, _, err := svc.GenerateTOTP(context.Background(), "user-1")
	require.NoError(t, err)
	require.NoError(t, svc.EnableTOTP(context.Background(), "user-1", validTOTPCode(t, secret)))

	pending, err := svc.Login(context.Background(), "mfa@b.com", "correct-password")
	require.NoError(t, err)

	code := validTOTPCode(t, secret)
	_, err = svc.CompleteLoginWithTOTP(context.Background(), pending.MFATicket, code)
	require.NoError(t, err)

	_, err = svc.CompleteLoginWithTOTP(context.Background(), pending.MFATicket, code)
	assert.Error(t, err)
}

func TestDisableTOTPRequiresValidCode(t *testing.T) {
	svc, repo, _ := newTestAuthService()
	mustCreateUser(t, repo, "user-1", "mfa@b.com", "correct-password")
	secret, _, err := svc.GenerateTOTP(context.Background(), "user-1")
	require.NoError(t, err)
	require.NoError(t, svc.EnableTOTP(context.Background(), "user-1", validTOTPCode(t, secret)))

	err = svc.DisableTOTP(context.Background(), "user-1", validTOTPCode(t, secret))
	require.NoError(t, err)

	stored, _ := repo.FindByID(context.Background(), "user-1")
	assert.False(t, stored.TOTPEnabled)
	assert.Empty(t, stored.TOTPSecret)
}
