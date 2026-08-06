package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strings"
)

const encryptedValuePrefix = "enc:v1:"

var (
	ErrCipherNotConfigured = errors.New("field encryption is not configured")
	ErrMalformedCiphertext = errors.New("encrypted value is malformed")
)

// FieldCipher encrypts individual database fields with AES-256-GCM and
// produces deterministic blind indexes (HMAC-SHA256) so encrypted columns can
// still be looked up by exact value.
type FieldCipher struct {
	aead    cipher.AEAD
	hmacKey []byte
}

func NewFieldCipher(secret string) (*FieldCipher, error) {
	if secret == "" {
		return nil, errors.New("encryption secret must not be empty")
	}

	encryptionKey := sha256.Sum256([]byte("field-encryption:" + secret))
	block, err := aes.NewCipher(encryptionKey[:])
	if err != nil {
		return nil, err
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	blindIndexKey := sha256.Sum256([]byte("blind-index:" + secret))
	return &FieldCipher{aead: aead, hmacKey: blindIndexKey[:]}, nil
}

func (fieldCipher *FieldCipher) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	nonce := make([]byte, fieldCipher.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}

	sealed := fieldCipher.aead.Seal(nonce, nonce, []byte(plaintext), nil)
	return encryptedValuePrefix + base64.StdEncoding.EncodeToString(sealed), nil
}

// Decrypt returns values without the encryption prefix untouched, so rows
// written before field encryption was introduced keep working.
func (fieldCipher *FieldCipher) Decrypt(storedValue string) (string, error) {
	if !strings.HasPrefix(storedValue, encryptedValuePrefix) {
		return storedValue, nil
	}

	rawValue, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(storedValue, encryptedValuePrefix))
	if err != nil {
		return "", ErrMalformedCiphertext
	}

	nonceSize := fieldCipher.aead.NonceSize()
	if len(rawValue) < nonceSize {
		return "", ErrMalformedCiphertext
	}

	plaintext, err := fieldCipher.aead.Open(nil, rawValue[:nonceSize], rawValue[nonceSize:], nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

// BlindIndex produces a deterministic keyed hash of the value (normalized to
// lowercase) used to look rows up by an encrypted column without storing the
// plaintext.
func (fieldCipher *FieldCipher) BlindIndex(value string) string {
	mac := hmac.New(sha256.New, fieldCipher.hmacKey)
	mac.Write([]byte(strings.ToLower(strings.TrimSpace(value))))
	return hex.EncodeToString(mac.Sum(nil))
}
