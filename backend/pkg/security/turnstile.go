package security

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const turnstileSiteVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

var turnstileHTTPClient = &http.Client{Timeout: 5 * time.Second}

// VerifyTurnstile validates a Cloudflare Turnstile widget response server-side.
// When no secret is configured (local/dev) it is skipped and returns true.
func VerifyTurnstile(ctx context.Context, secret string, responseToken string, remoteIP string) (bool, error) {
	if secret == "" || responseToken == "" {
		return true, nil
	}

	form := url.Values{}
	form.Set("secret", secret)
	form.Set("response", responseToken)
	if remoteIP != "" {
		form.Set("remoteip", remoteIP)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, turnstileSiteVerifyURL, bytes.NewBufferString(form.Encode()))
	if err != nil {
		return false, err
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	response, err := turnstileHTTPClient.Do(request)
	if err != nil {
		return false, err
	}
	defer func() {
		_ = response.Body.Close()
	}()

	body, err := io.ReadAll(io.LimitReader(response.Body, 64*1024))
	if err != nil {
		return false, err
	}

	var result struct {
		Success    bool     `json:"success"`
		ErrorCodes []string `json:"error-codes"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return false, fmt.Errorf("turnstile: invalid verification response: %w", err)
	}
	if !result.Success {
		return false, nil
	}
	return true, nil
}