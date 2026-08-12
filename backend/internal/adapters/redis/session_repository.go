package redis

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"debtcontrol/backend/internal/core/ports"
)

// refreshFamily holds the state of one opaque refresh-token family: the current
// token hash and the hashes of previously rotated (spent) tokens, so reuse can
// be detected and the family revoked.
type refreshFamily struct {
	UserID    string          `json:"user_id"`
	Current   string          `json:"current"`
	Spent     map[string]bool `json:"spent"`
	ExpiresAt time.Time       `json:"expires_at"`
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func generateOpaqueToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

// --- Redis-backed SessionRepository -------------------------------------------------

type SessionRepository struct {
	redisClient *redis.Client
}

func NewSessionRepository(redisClient *redis.Client) *SessionRepository {
	return &SessionRepository{redisClient: redisClient}
}

func (repository *SessionRepository) StoreSession(ctx context.Context, userID string, tokenID string, expiration time.Duration) error {
	if repository.redisClient == nil {
		return nil
	}
	sessionKey := "session:" + tokenID
	return repository.redisClient.Set(ctx, sessionKey, userID, expiration).Err()
}

func (repository *SessionRepository) IsSessionBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	if repository.redisClient == nil {
		return false, nil
	}
	blacklistKey := "blacklist:" + tokenID
	result, err := repository.redisClient.Exists(ctx, blacklistKey).Result()
	if err != nil {
		return false, nil
	}
	return result > 0, nil
}

func (repository *SessionRepository) InvalidateSession(ctx context.Context, tokenID string, expiration time.Duration) error {
	if repository.redisClient == nil {
		return nil
	}
	blacklistKey := "blacklist:" + tokenID
	sessionKey := "session:" + tokenID
	_ = repository.redisClient.Del(ctx, sessionKey).Err()
	return repository.redisClient.Set(ctx, blacklistKey, "revoked", expiration).Err()
}

func (repository *SessionRepository) refreshFamilyKey(familyID string) string {
	return "refresh:family:" + familyID
}

func (repository *SessionRepository) refreshTokenKey(tokenHash string) string {
	return "refresh:token:" + tokenHash
}

func (repository *SessionRepository) CreateRefreshSession(ctx context.Context, userID string, expiration time.Duration) (string, string, error) {
	if repository.redisClient == nil {
		return "", "", errors.New("redis session store not configured")
	}
	token, err := generateOpaqueToken()
	if err != nil {
		return "", "", err
	}
	family := refreshFamily{
		UserID:    userID,
		Current:   hashToken(token),
		Spent:     map[string]bool{},
		ExpiresAt: time.Now().Add(expiration),
	}
	encoded, err := json.Marshal(&family)
	if err != nil {
		return "", "", err
	}
	familyID := uuid.New().String()
	pipe := repository.redisClient.TxPipeline()
	pipe.Set(ctx, repository.refreshFamilyKey(familyID), encoded, expiration)
	pipe.Set(ctx, repository.refreshTokenKey(family.Current), familyID, expiration)
	if _, err := pipe.Exec(ctx); err != nil {
		return "", "", err
	}
	return token, familyID, nil
}

func (repository *SessionRepository) RefreshSession(ctx context.Context, presentedToken string, expiration time.Duration) (string, string, string, error) {
	if repository.redisClient == nil {
		return "", "", "", errors.New("redis session store not configured")
	}
	presentedHash := hashToken(presentedToken)

	familyID, err := repository.redisClient.Get(ctx, repository.refreshTokenKey(presentedHash)).Result()
	if err == redis.Nil {
		return "", "", "", errors.New("invalid refresh token")
	}
	if err != nil {
		return "", "", "", err
	}

	var (
		userID   string
		newToken string
	)
	familyKey := repository.refreshFamilyKey(familyID)
	tokenKey := repository.refreshTokenKey(presentedHash)

	// WATCH the family key: rotation and reuse-revocation are read-modify-write,
	// and must be atomic so a concurrent replay of the same token cannot slip
	// past reuse detection (TOCTOU).
	watchErr := repository.redisClient.Watch(ctx, func(tx *redis.Tx) error {
		encoded, err := tx.Get(ctx, familyKey).Bytes()
		if err == redis.Nil {
			return errors.New("invalid refresh token")
		}
		if err != nil {
			return err
		}
		var family refreshFamily
		if err := json.Unmarshal(encoded, &family); err != nil {
			return err
		}

		if family.Spent[presentedHash] {
			_ = repository.revokeFamilyTx(ctx, tx, familyID, &family)
			return ports.ErrRefreshReuse
		}
		if presentedHash != family.Current {
			_ = repository.revokeFamilyTx(ctx, tx, familyID, &family)
			return errors.New("invalid refresh token")
		}

		rotated, err := generateOpaqueToken()
		if err != nil {
			return err
		}
		rotatedHash := hashToken(rotated)
		family.Spent[family.Current] = true
		family.Current = rotatedHash
		family.ExpiresAt = time.Now().Add(expiration)
		encodedNext, err := json.Marshal(&family)
		if err != nil {
			return err
		}

		_, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			pipe.Set(ctx, familyKey, encodedNext, expiration)
			// The spent token key is intentionally KEPT pointing at the family so a
			// replay of it later resolves here and reaches the reuse branch above.
			pipe.Set(ctx, repository.refreshTokenKey(rotatedHash), familyID, expiration)
			return nil
		})
		if err != nil {
			return err
		}
		userID = family.UserID
		newToken = rotated
		return nil
	}, familyKey, tokenKey)

	if errors.Is(watchErr, redis.TxFailedErr) {
		return repository.RefreshSession(ctx, presentedToken, expiration)
	}
	if watchErr != nil {
		return "", "", "", watchErr
	}
	return userID, familyID, newToken, nil
}

// revokeFamilyTx removes the family and all its token keys atomically within an
// existing transaction.
func (repository *SessionRepository) revokeFamilyTx(ctx context.Context, tx *redis.Tx, familyID string, family *refreshFamily) error {
	keys := []string{repository.refreshFamilyKey(familyID), repository.refreshTokenKey(family.Current)}
	for spent := range family.Spent {
		keys = append(keys, repository.refreshTokenKey(spent))
	}
	_, err := tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.Del(ctx, keys...)
		return nil
	})
	return err
}

func (repository *SessionRepository) revokeFamily(ctx context.Context, familyID string) error {
	if repository.redisClient == nil {
		return nil
	}
	encoded, err := repository.redisClient.Get(ctx, repository.refreshFamilyKey(familyID)).Bytes()
	if err != nil {
		return err
	}
	var family refreshFamily
	if err := json.Unmarshal(encoded, &family); err != nil {
		return err
	}
	pipe := repository.redisClient.TxPipeline()
	pipe.Del(ctx, repository.refreshFamilyKey(familyID))
	pipe.Del(ctx, repository.refreshTokenKey(family.Current))
	for spent := range family.Spent {
		pipe.Del(ctx, repository.refreshTokenKey(spent))
	}
	_, err = pipe.Exec(ctx)
	return err
}

func (repository *SessionRepository) RevokeSession(ctx context.Context, presentedToken string) error {
	if repository.redisClient == nil {
		return nil
	}
	familyID, err := repository.redisClient.Get(ctx, repository.refreshTokenKey(hashToken(presentedToken))).Result()
	if err != nil {
		return nil // already revoked
	}
	return repository.revokeFamily(ctx, familyID)
}

func (repository *SessionRepository) RevokeAllUserSessions(ctx context.Context, userID string) error {
	if repository.redisClient == nil {
		return nil
	}
	var cursor uint64
	for {
		keys, next, err := repository.redisClient.Scan(ctx, cursor, "refresh:family:*", 100).Result()
		if err != nil {
			return err
		}
		for _, key := range keys {
			encoded, err := repository.redisClient.Get(ctx, key).Bytes()
			if err != nil {
				continue
			}
			var family refreshFamily
			if json.Unmarshal(encoded, &family) == nil && family.UserID == userID {
				_ = repository.revokeFamily(ctx, key[len("refresh:family:"):])
			}
		}
		cursor = next
		if cursor == 0 {
			break
		}
	}
	return nil
}

func (repository *SessionRepository) mfaTicketKey(ticket string) string {
	return "mfa:ticket:" + ticket
}

func (repository *SessionRepository) passwordResetOTPKey(email string) string {
	return "pwdreset:otp:" + email
}

func (repository *SessionRepository) passwordResetTicketKey(ticket string) string {
	return "pwdreset:ticket:" + ticket
}

// confirmOTPRecord is the stored state of one password-reset OTP: the code and
// how many attempts remain. The code is compared in constant time on verify.
type passwordResetOTPRecord struct {
	Code     string `json:"code"`
	Attempts int    `json:"attempts"`
}

var errResetOTPExhausted = errors.New("password reset code exhausted or expired")

func (repository *SessionRepository) StorePasswordResetOTP(ctx context.Context, email string, code string, maxAttempts int, expiration time.Duration) error {
	record, err := json.Marshal(passwordResetOTPRecord{Code: code, Attempts: maxAttempts})
	if err != nil {
		return err
	}
	return repository.redisClient.Set(ctx, repository.passwordResetOTPKey(email), record, expiration).Err()
}

func (repository *SessionRepository) VerifyPasswordResetOTP(ctx context.Context, email string, presentedCode string) (bool, error) {
	encoded, err := repository.redisClient.Get(ctx, repository.passwordResetOTPKey(email)).Bytes()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	var record passwordResetOTPRecord
	if json.Unmarshal(encoded, &record) != nil {
		_ = repository.redisClient.Del(ctx, repository.passwordResetOTPKey(email)).Err()
		return false, errResetOTPExhausted
	}

	if subtle.ConstantTimeCompare([]byte(record.Code), []byte(presentedCode)) == 1 {
		_ = repository.redisClient.Del(ctx, repository.passwordResetOTPKey(email)).Err()
		return true, nil
	}

	record.Attempts--
	if record.Attempts <= 0 {
		_ = repository.redisClient.Del(ctx, repository.passwordResetOTPKey(email)).Err()
		return false, errResetOTPExhausted
	}
	updated, err := json.Marshal(record)
	if err == nil {
		_ = repository.redisClient.Set(ctx, repository.passwordResetOTPKey(email), updated, 0).Err()
	}
	return false, nil
}

func (repository *SessionRepository) StorePasswordResetTicket(ctx context.Context, ticket string, email string, expiration time.Duration) error {
	return repository.redisClient.Set(ctx, repository.passwordResetTicketKey(ticket), email, expiration).Err()
}

func (repository *SessionRepository) ConsumePasswordResetTicket(ctx context.Context, ticket string) (string, error) {
	email, err := repository.redisClient.GetDel(ctx, repository.passwordResetTicketKey(ticket)).Result()
	if err == redis.Nil {
		return "", errors.New("invalid or expired password reset ticket")
	}
	if err != nil {
		return "", err
	}
	return email, nil
}

func (repository *SessionRepository) StoreMFAChallenge(ctx context.Context, ticket string, userID string, expiration time.Duration) error {
	if repository.redisClient == nil {
		return errors.New("redis session store not configured")
	}
	return repository.redisClient.Set(ctx, repository.mfaTicketKey(ticket), userID, expiration).Err()
}

// ConsumeMFAChallenge atomically redeems the single-use ticket. GETDEL makes
// replayed tickets impossible: the second redemption sees no value.
func (repository *SessionRepository) ConsumeMFAChallenge(ctx context.Context, ticket string) (string, error) {
	if repository.redisClient == nil {
		return "", errors.New("redis session store not configured")
	}
	userID, err := repository.redisClient.GetDel(ctx, repository.mfaTicketKey(ticket)).Result()
	if err == redis.Nil {
		return "", errors.New("invalid or expired MFA ticket")
	}
	if err != nil {
		return "", err
	}
	return userID, nil
}

// --- In-memory SessionRepository (fallback + tests) --------------------------------

type MemorySessionRepository struct {
	mu            sync.RWMutex
	blacklist     map[string]time.Time
	families      map[string]*refreshFamily // familyID -> family
	tokenToFamily map[string]string         // tokenHash -> familyID
	mfaTickets    map[string]string         // ticket -> userID (single-use)
	resetOTPs     map[string]*passwordResetOTPRecord
	resetTickets  map[string]string // ticket -> email
}

func NewMemorySessionRepository() *MemorySessionRepository {
	return &MemorySessionRepository{
		blacklist:     make(map[string]time.Time),
		families:      make(map[string]*refreshFamily),
		tokenToFamily: make(map[string]string),
		mfaTickets:    make(map[string]string),
		resetOTPs:     make(map[string]*passwordResetOTPRecord),
		resetTickets:  make(map[string]string),
	}
}

func (repo *MemorySessionRepository) StoreMFAChallenge(ctx context.Context, ticket string, userID string, expiration time.Duration) error {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	repo.mfaTickets[ticket] = userID
	return nil
}

func (repo *MemorySessionRepository) ConsumeMFAChallenge(ctx context.Context, ticket string) (string, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	userID, exists := repo.mfaTickets[ticket]
	if !exists {
		return "", errors.New("invalid or expired MFA ticket")
	}
	delete(repo.mfaTickets, ticket)
	return userID, nil
}

func (repo *MemorySessionRepository) StorePasswordResetOTP(ctx context.Context, email string, code string, maxAttempts int, expiration time.Duration) error {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	repo.resetOTPs[email] = &passwordResetOTPRecord{Code: code, Attempts: maxAttempts}
	return nil
}

func (repo *MemorySessionRepository) VerifyPasswordResetOTP(ctx context.Context, email string, presentedCode string) (bool, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	record, exists := repo.resetOTPs[email]
	if !exists {
		return false, nil
	}

	if subtle.ConstantTimeCompare([]byte(record.Code), []byte(presentedCode)) == 1 {
		delete(repo.resetOTPs, email)
		return true, nil
	}

	record.Attempts--
	if record.Attempts <= 0 {
		delete(repo.resetOTPs, email)
		return false, errResetOTPExhausted
	}
	return false, nil
}

func (repo *MemorySessionRepository) StorePasswordResetTicket(ctx context.Context, ticket string, email string, expiration time.Duration) error {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	repo.resetTickets[ticket] = email
	return nil
}

func (repo *MemorySessionRepository) ConsumePasswordResetTicket(ctx context.Context, ticket string) (string, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	email, exists := repo.resetTickets[ticket]
	if !exists {
		return "", errors.New("invalid or expired password reset ticket")
	}
	delete(repo.resetTickets, ticket)
	return email, nil
}

func (repo *MemorySessionRepository) StoreSession(ctx context.Context, userID string, tokenID string, expiration time.Duration) error {
	return nil
}

func (repo *MemorySessionRepository) IsSessionBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	exp, exists := repo.blacklist[tokenID]
	if !exists {
		return false, nil
	}
	if time.Now().After(exp) {
		return false, nil
	}
	return true, nil
}

func (repo *MemorySessionRepository) InvalidateSession(ctx context.Context, tokenID string, expiration time.Duration) error {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	repo.blacklist[tokenID] = time.Now().Add(expiration)
	return nil
}

func (repo *MemorySessionRepository) CreateRefreshSession(ctx context.Context, userID string, expiration time.Duration) (string, string, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	token, err := generateOpaqueToken()
	if err != nil {
		return "", "", err
	}
	familyID := uuid.New().String()
	family := &refreshFamily{
		UserID:    userID,
		Current:   hashToken(token),
		Spent:     map[string]bool{},
		ExpiresAt: time.Now().Add(expiration),
	}
	repo.families[familyID] = family
	repo.tokenToFamily[family.Current] = familyID
	return token, familyID, nil
}

func (repo *MemorySessionRepository) RefreshSession(ctx context.Context, presentedToken string, expiration time.Duration) (string, string, string, error) {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	presentedHash := hashToken(presentedToken)
	familyID, exists := repo.tokenToFamily[presentedHash]
	if !exists {
		return "", "", "", errors.New("invalid refresh token")
	}
	family := repo.families[familyID]
	if family == nil {
		return "", "", "", errors.New("invalid refresh token")
	}
	if time.Now().After(family.ExpiresAt) {
		repo.deleteFamilyLocked(familyID)
		return "", "", "", errors.New("refresh token expired")
	}

	if family.Spent[presentedHash] {
		repo.deleteFamilyLocked(familyID)
		return "", "", "", ports.ErrRefreshReuse
	}
	if presentedHash != family.Current {
		repo.deleteFamilyLocked(familyID)
		return "", "", "", errors.New("invalid refresh token")
	}

	newToken, err := generateOpaqueToken()
	if err != nil {
		return "", "", "", err
	}
	newHash := hashToken(newToken)
	family.Spent[family.Current] = true
	family.Current = newHash
	family.ExpiresAt = time.Now().Add(expiration)
	repo.tokenToFamily[newHash] = familyID

	return family.UserID, familyID, newToken, nil
}

func (repo *MemorySessionRepository) RevokeSession(ctx context.Context, presentedToken string) error {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	familyID, exists := repo.tokenToFamily[hashToken(presentedToken)]
	if !exists {
		return nil
	}
	repo.deleteFamilyLocked(familyID)
	return nil
}

func (repo *MemorySessionRepository) RevokeAllUserSessions(ctx context.Context, userID string) error {
	repo.mu.Lock()
	defer repo.mu.Unlock()

	for familyID, family := range repo.families {
		if family.UserID == userID {
			repo.deleteFamilyLocked(familyID)
		}
	}
	return nil
}

func (repo *MemorySessionRepository) deleteFamilyLocked(familyID string) {
	family, exists := repo.families[familyID]
	if !exists {
		return
	}
	delete(repo.tokenToFamily, family.Current)
	for spent := range family.Spent {
		delete(repo.tokenToFamily, spent)
	}
	delete(repo.families, familyID)
}

// SnapshotActiveTokens returns every token hash currently tracked (for tests).
func (repo *MemorySessionRepository) SnapshotActiveTokens() []string {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	hashes := make([]string, 0, len(repo.tokenToFamily))
	for tokenHash := range repo.tokenToFamily {
		hashes = append(hashes, tokenHash)
	}
	return hashes
}

// SnapshotFamilies returns all family ids (for tests).
func (repo *MemorySessionRepository) SnapshotFamilies() []string {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	families := make([]string, 0, len(repo.families))
	for familyID := range repo.families {
		families = append(families, familyID)
	}
	return families
}

// SnapshotFamiliesForUser returns the family ids belonging to the user (for tests).
func (repo *MemorySessionRepository) SnapshotFamiliesForUser(userID string) []string {
	repo.mu.RLock()
	defer repo.mu.RUnlock()

	var families []string
	for familyID, family := range repo.families {
		if family.UserID == userID {
			families = append(families, familyID)
		}
	}
	return families
}
