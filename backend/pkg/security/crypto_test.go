package security

import (
	"strings"
	"testing"
)

func TestFieldCipherRoundTrip(t *testing.T) {
	fieldCipher, err := NewFieldCipher("test-secret")
	if err != nil {
		t.Fatalf("NewFieldCipher failed: %v", err)
	}

	plaintext := "guillejimenez08@gmail.com"
	encrypted, err := fieldCipher.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}
	if !strings.HasPrefix(encrypted, "enc:v1:") {
		t.Fatalf("expected encrypted value to carry the enc:v1: prefix, got %q", encrypted)
	}
	if strings.Contains(encrypted, plaintext) {
		t.Fatal("ciphertext must not contain the plaintext")
	}

	decrypted, err := fieldCipher.Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}
	if decrypted != plaintext {
		t.Fatalf("round trip mismatch: got %q want %q", decrypted, plaintext)
	}
}

func TestFieldCipherEncryptIsNonDeterministic(t *testing.T) {
	fieldCipher, _ := NewFieldCipher("test-secret")

	first, _ := fieldCipher.Encrypt("same value")
	second, _ := fieldCipher.Encrypt("same value")
	if first == second {
		t.Fatal("two encryptions of the same plaintext must produce different ciphertexts")
	}
}

func TestFieldCipherEmptyStringStaysEmpty(t *testing.T) {
	fieldCipher, _ := NewFieldCipher("test-secret")

	encrypted, err := fieldCipher.Encrypt("")
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}
	if encrypted != "" {
		t.Fatalf("empty plaintext should stay empty, got %q", encrypted)
	}
}

func TestFieldCipherLegacyPlaintextPassesThrough(t *testing.T) {
	fieldCipher, _ := NewFieldCipher("test-secret")

	legacyValue := "stored-before-encryption@example.com"
	decrypted, err := fieldCipher.Decrypt(legacyValue)
	if err != nil {
		t.Fatalf("Decrypt failed on legacy value: %v", err)
	}
	if decrypted != legacyValue {
		t.Fatalf("legacy plaintext must pass through untouched, got %q", decrypted)
	}
}

func TestFieldCipherWrongKeyFails(t *testing.T) {
	writerCipher, _ := NewFieldCipher("key-one")
	readerCipher, _ := NewFieldCipher("key-two")

	encrypted, _ := writerCipher.Encrypt("sensitive")
	if _, err := readerCipher.Decrypt(encrypted); err == nil {
		t.Fatal("decrypting with the wrong key must fail")
	}
}

func TestBlindIndexIsDeterministicAndNormalized(t *testing.T) {
	fieldCipher, _ := NewFieldCipher("test-secret")

	first := fieldCipher.BlindIndex("User@Example.com")
	second := fieldCipher.BlindIndex("  user@example.com ")
	if first != second {
		t.Fatal("blind index must normalize case and whitespace")
	}

	otherCipher, _ := NewFieldCipher("another-secret")
	if fieldCipher.BlindIndex("user@example.com") == otherCipher.BlindIndex("user@example.com") {
		t.Fatal("blind index must depend on the secret")
	}
}
