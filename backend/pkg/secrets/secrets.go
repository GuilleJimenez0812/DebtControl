package secrets

import (
	"fmt"
	"os"
	"strings"
)

// App environments. Production is the strict env: missing secrets abort startup
// rather than falling back to insecure defaults.
const (
	EnvDevelopment = "development"
	EnvProduction  = "production"
)

// Resolve returns the value of the environment variable keyed by envVar, or
// falls back to devDefault when unset and the current environment is
// development. In any non-development environment a missing (or whitespace
// only) secret is an error so the caller can fail hard at startup instead of
// booting with an insecure default.
func Resolve(envVar, appEnv, devDefault string) (string, error) {
	value := os.Getenv(envVar)
	if strings.TrimSpace(value) != "" {
		return value, nil
	}

	if appEnv == EnvDevelopment {
		return devDefault, nil
	}

	return "", fmt.Errorf("required secret %s is not set in environment %q; refusing to start with an insecure default", envVar, appEnv)
}
