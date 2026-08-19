package http_test

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	httpAdapter "debtcontrol/backend/internal/adapters/http"
	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"
	"debtcontrol/backend/pkg/ratelimit"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubAuth struct {
	loginErr error
}

func (s *stubAuth) Register(ctx context.Context, email, password, fullName string) (*domain.User, error) {
	return nil, nil
}
func (s *stubAuth) Login(ctx context.Context, email, password string) (*ports.LoginResult, error) {
	return nil, s.loginErr
}
func (s *stubAuth) CompleteLoginWithTOTP(ctx context.Context, ticket, code string) (*ports.LoginResult, error) {
	return nil, nil
}
func (s *stubAuth) Refresh(ctx context.Context, token string) (string, string, *domain.User, error) {
	return "", "", nil, nil
}
func (s *stubAuth) Logout(ctx context.Context, tokenID, refresh string) error { return nil }
func (s *stubAuth) LogoutEverywhere(ctx context.Context, userID string) error { return nil }
func (s *stubAuth) ValidateAccessToken(ctx context.Context, token string) (*domain.User, string, error) {
	return nil, "", nil
}
func (s *stubAuth) GenerateTOTP(ctx context.Context, userID string) (string, string, error) {
	return "", "", nil
}
func (s *stubAuth) EnableTOTP(ctx context.Context, userID, code string) error      { return nil }
func (s *stubAuth) DisableTOTP(ctx context.Context, userID, code string) error     { return nil }
func (s *stubAuth) GetTOTPStatus(ctx context.Context, userID string) (bool, error) { return false, nil }
func (s *stubAuth) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error {
	return nil
}
func (s *stubAuth) RequestPasswordReset(ctx context.Context, email string) error { return nil }
func (s *stubAuth) VerifyPasswordResetOTP(ctx context.Context, email, code string) (string, error) {
	return "", nil
}
func (s *stubAuth) ResetPassword(ctx context.Context, ticket, newPassword string) error { return nil }

var _ ports.AuthUseCase = (*stubAuth)(nil)

type stubDebt struct{}

func (d *stubDebt) GetDashboardSummaryForUser(ctx context.Context, user *domain.User) (*ports.DashboardSummary, error) {
	return nil, nil
}
func (d *stubDebt) ListPersonsForUser(ctx context.Context, user *domain.User) ([]*domain.Person, error) {
	return nil, nil
}
func (d *stubDebt) CreatePurchaseItem(ctx context.Context, a, b, c string, d1, d2, d3 float64, invUrl, e string) (*domain.PurchaseItem, error) {
	return nil, nil
}
func (d *stubDebt) UpdatePurchaseItem(ctx context.Context, id string, description string, a, b, c float64, inv string, dp string) (*domain.PurchaseItem, error) {
	return nil, nil
}
func (d *stubDebt) UpdateShippingPackage(ctx context.Context, id string, a float64, b, c bool, dt string) (*domain.ShippingPackage, error) {
	return nil, nil
}
func (d *stubDebt) CreateShippingPackage(ctx context.Context, id, tracking string, cost float64) (*domain.ShippingPackage, error) {
	return nil, nil
}
func (d *stubDebt) ReassignPurchaseToPerson(ctx context.Context, orderID, personID string) (*domain.PurchaseItem, error) {
	return nil, nil
}
func (d *stubDebt) DeletePurchase(ctx context.Context, orderID string) error { return nil }
func (d *stubDebt) RecordPayment(ctx context.Context, personID string, amount float64, notes string) (*domain.PaymentTransaction, error) {
	return nil, nil
}
func (d *stubDebt) ProcessInvoiceUpload(ctx context.Context, b []byte, name string) (*ports.ParseInvoiceResult, error) {
	return nil, nil
}
func (d *stubDebt) ConfirmAttachInvoice(ctx context.Context, a, b, c string) (*domain.PurchaseItem, error) {
	return nil, nil
}
func (d *stubDebt) SearchOrders(ctx context.Context, q string, user *domain.User, limit int) ([]*ports.SearchResult, error) {
	return nil, nil
}
func (d *stubDebt) SeedInitialSpreadsheetData(ctx context.Context) error { return nil }
func (d *stubDebt) ResetAndSeedData(ctx context.Context) error           { return nil }
func (d *stubDebt) GetAuditLogs(ctx context.Context, limit, offset int) ([]*domain.AuditLog, error) {
	return nil, nil
}

var _ ports.DebtUseCase = (*stubDebt)(nil)

type stubAdmin struct{}

func (a *stubAdmin) CreateUser(ctx context.Context, e, p, n, r string) (*domain.User, error) {
	return nil, nil
}
func (a *stubAdmin) ListUsersWithPersons(ctx context.Context) ([]*ports.UserWithPersons, error) {
	return nil, nil
}
func (a *stubAdmin) AssignPersonsToUser(ctx context.Context, userID string, personIDs []string) error {
	return nil
}

var _ ports.AdminUseCase = (*stubAdmin)(nil)

func newTestRouter(security httpAdapter.SecurityOptions) *gin.Engine {
	gin.SetMode(gin.TestMode)
	return httpAdapter.SetupRouter(&stubAuth{loginErr: errLoginFailed}, &stubDebt{}, &stubAdmin{}, &stubExchangeRateUseCase{}, []string{"http://localhost:5173"}, false, security)
}

func doLogin(t *testing.T, router *gin.Engine, ip string, body string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(body))
	request.RemoteAddr = ip + ":1234"
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestLoginRateLimitedAfterFiveAttempts(t *testing.T) {
	limiter := ratelimit.NewLimiter(ratelimit.NewMemoryStore())
	router := newTestRouter(httpAdapter.SecurityOptions{
		RateLimiter:     limiter,
		LoginPolicies:   []ratelimit.Policy{{Limit: 5, Window: 15 * time.Minute}},
		TurnstileSecret: "",
	})

	body := `{"email":"a@b.com","password":"wrong"}`
	for i := 0; i < 5; i++ {
		response := doLogin(t, router, "203.0.113.1", body)
		require.NotEqual(t, http.StatusTooManyRequests, response.Code, "attempt %d", i+1)
	}

	response := doLogin(t, router, "203.0.113.1", body)
	assert.Equal(t, http.StatusTooManyRequests, response.Code)
	assert.NotEmpty(t, response.Header().Get("Retry-After"))
}

func TestLoginRateLimitSeparatePerAccount(t *testing.T) {
	limiter := ratelimit.NewLimiter(ratelimit.NewMemoryStore())
	router := newTestRouter(httpAdapter.SecurityOptions{
		RateLimiter:     limiter,
		LoginPolicies:   []ratelimit.Policy{{Limit: 2, Window: 15 * time.Minute}},
		TurnstileSecret: "",
	})

	for i := 0; i < 2; i++ {
		response := doLogin(t, router, "203.0.113.9", `{"email":"victim@b.com","password":"wrong"}`)
		require.NotEqual(t, http.StatusTooManyRequests, response.Code)
	}

	response := doLogin(t, router, "203.0.113.9", `{"email":"other@b.com","password":"wrong"}`)
	assert.NotEqual(t, http.StatusTooManyRequests, response.Code)
}

func TestGlobalThrottleAppliesToApiGroup(t *testing.T) {
	limiter := ratelimit.NewLimiter(ratelimit.NewMemoryStore())
	router := newTestRouter(httpAdapter.SecurityOptions{
		RateLimiter:     limiter,
		GlobalPolicies:  []ratelimit.Policy{{Limit: 2, Window: time.Minute}},
		TurnstileSecret: "",
	})

	for i := 0; i < 2; i++ {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/auth/registration-status", nil)
		request.RemoteAddr = "198.51.100.1:1234"
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
	}
	request := httptest.NewRequest(http.MethodGet, "/api/v1/auth/registration-status", nil)
	request.RemoteAddr = "198.51.100.1:1234"
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	assert.Equal(t, http.StatusTooManyRequests, response.Code)
}

func TestTurnstileSkippedWhenSecretEmpty(t *testing.T) {
	limiter := ratelimit.NewLimiter(ratelimit.NewMemoryStore())
	router := newTestRouter(httpAdapter.SecurityOptions{
		RateLimiter:     limiter,
		LoginPolicies:   []ratelimit.Policy{{Limit: 100, Window: time.Minute}},
		TurnstileSecret: "",
	})

	response := doLogin(t, router, "203.0.113.5", `{"email":"a@b.com","password":"x"}`)
	// Without a configured secret the CAPTCHA guard is skipped, so the request
	// must not be rejected with 429/403; it reaches the auth handler.
	assert.NotEqual(t, http.StatusTooManyRequests, response.Code)
	assert.NotEqual(t, http.StatusForbidden, response.Code)
}

func TestSecurityHeadersPresentOnEveryResponse(t *testing.T) {
	router := newTestRouter(httpAdapter.SecurityOptions{})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/auth/registration-status", nil)
	request.RemoteAddr = "203.0.113.10:1234"
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	expected := map[string]string{
		"X-Frame-Options":           "DENY",
		"X-Content-Type-Options":    "nosniff",
		"X-XSS-Protection":          "1; mode=block",
		"Referrer-Policy":           "strict-origin-when-cross-origin",
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
		"Permissions-Policy":        "geolocation=(), camera=(), microphone=()",
	}
	for header, want := range expected {
		assert.Equal(t, want, response.Header().Get(header), "header %s", header)
	}
}

func TestChangePasswordRequiresAuthentication(t *testing.T) {
	router := newTestRouter(httpAdapter.SecurityOptions{})

	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/change-password",
		bytes.NewBufferString(`{"current_password":"old-1234","new_password":"new-strong-1234"}`))
	request.Header.Set("X-CSRF-Token", "some-csrf")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	// No access token -> AuthMiddleware aborts with 401 before validating the
	// payload, proving the route is protected.
	assert.Equal(t, http.StatusUnauthorized, response.Code)
}

func TestForgotPasswordRateLimitedPerIP(t *testing.T) {
	limiter := ratelimit.NewLimiter(ratelimit.NewMemoryStore())
	router := newTestRouter(httpAdapter.SecurityOptions{
		RateLimiter:          limiter,
		ResetRequestPolicies: []ratelimit.Policy{{Limit: 2, Window: time.Minute}},
		ResetVerifyPolicies:  []ratelimit.Policy{{Limit: 100, Window: time.Minute}},
		TurnstileSecret:      "",
	})

	body := `{"email":"reset@b.com"}`
	for i := 0; i < 2; i++ {
		request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewBufferString(body))
		request.RemoteAddr = "203.0.113.20:1234"
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		require.NotEqual(t, http.StatusTooManyRequests, response.Code, "request %d", i+1)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewBufferString(body))
	request.RemoteAddr = "203.0.113.20:1234"
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	assert.Equal(t, http.StatusTooManyRequests, response.Code)
	assert.NotEmpty(t, response.Header().Get("Retry-After"))
}

var errLoginFailed = &testHTTPErr{"invalid email or password"}

type testHTTPErr struct{ msg string }

func (e *testHTTPErr) Error() string { return e.msg }


type stubExchangeRateUseCase struct{}

func (s *stubExchangeRateUseCase) FetchAndSaveBCVRates(ctx context.Context) (map[string]*domain.ExchangeRate, error) {
	return nil, nil
}
func (s *stubExchangeRateUseCase) GetLatestRates(ctx context.Context) (map[string]*domain.ExchangeRate, error) {
	return nil, nil
}
func (s *stubExchangeRateUseCase) SaveManualRate(ctx context.Context, currency string, rate float64) (*domain.ExchangeRate, error) {
	return nil, nil
}

func (s *stubAdmin) AssignModulesToUser(ctx context.Context, userID string, modules []string) error { return nil }
func (s *stubAdmin) GetAssignedModules(ctx context.Context, userID string) ([]string, error) { return nil, nil }
