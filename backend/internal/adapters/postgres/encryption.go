package postgres

import (
	"context"
	"fmt"
	"reflect"

	"debtcontrol/backend/pkg/security"

	"gorm.io/gorm/schema"
)

var fieldCipher *security.FieldCipher

// SetupEncryption wires the AES-GCM field cipher into GORM so model fields
// tagged with `serializer:encrypted` are encrypted at rest. It must be called
// before the first database operation.
func SetupEncryption(secret string) error {
	cipherInstance, err := security.NewFieldCipher(secret)
	if err != nil {
		return err
	}

	fieldCipher = cipherInstance
	schema.RegisterSerializer("encrypted", encryptedStringSerializer{})
	return nil
}

func blindIndex(value string) (string, error) {
	if fieldCipher == nil {
		return "", security.ErrCipherNotConfigured
	}
	return fieldCipher.BlindIndex(value), nil
}

type encryptedStringSerializer struct{}

func (encryptedStringSerializer) Scan(ctx context.Context, field *schema.Field, dst reflect.Value, dbValue interface{}) error {
	if fieldCipher == nil {
		return security.ErrCipherNotConfigured
	}

	var storedValue string
	switch typedValue := dbValue.(type) {
	case nil:
	case string:
		storedValue = typedValue
	case []byte:
		storedValue = string(typedValue)
	default:
		return fmt.Errorf("encrypted serializer: unsupported database value type %T", dbValue)
	}

	plaintext, err := fieldCipher.Decrypt(storedValue)
	if err != nil {
		return err
	}
	return field.Set(ctx, dst, plaintext)
}

func (encryptedStringSerializer) Value(ctx context.Context, field *schema.Field, dst reflect.Value, fieldValue interface{}) (interface{}, error) {
	if fieldCipher == nil {
		return nil, security.ErrCipherNotConfigured
	}

	stringValue, isString := fieldValue.(string)
	if !isString && fieldValue != nil {
		return nil, fmt.Errorf("encrypted serializer: unsupported field type %T", fieldValue)
	}
	return fieldCipher.Encrypt(stringValue)
}
