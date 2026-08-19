package services

import (
	"context"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"
	"github.com/google/uuid"
)

type ExchangeRateService struct {
	repo ports.ExchangeRateRepository
}

func NewExchangeRateService(repo ports.ExchangeRateRepository) *ExchangeRateService {
	return &ExchangeRateService{repo: repo}
}

func (s *ExchangeRateService) FetchAndSaveBCVRates(ctx context.Context) (map[string]*domain.ExchangeRate, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.bcv.org.ve/", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("failed to fetch bcv page")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	html := string(body)

	usdRate, err := extractRate(html, "dolar")
	if err != nil {
		return nil, err
	}

	eurRate, err := extractRate(html, "euro")
	if err != nil {
		return nil, err
	}

	now := time.Now()

	usd := &domain.ExchangeRate{
		ID:        uuid.New().String(),
		Currency:  domain.CurrencyUSD,
		Rate:      usdRate,
		Source:    domain.SourceBCVScraper,
		CreatedAt: now,
	}

	eur := &domain.ExchangeRate{
		ID:        uuid.New().String(),
		Currency:  domain.CurrencyEUR,
		Rate:      eurRate,
		Source:    domain.SourceBCVScraper,
		CreatedAt: now,
	}

	if err := s.repo.Save(ctx, usd); err != nil {
		return nil, err
	}
	if err := s.repo.Save(ctx, eur); err != nil {
		return nil, err
	}

	return map[string]*domain.ExchangeRate{
		domain.CurrencyUSD: usd,
		domain.CurrencyEUR: eur,
	}, nil
}

func (s *ExchangeRateService) GetLatestRates(ctx context.Context) (map[string]*domain.ExchangeRate, error) {
	usd, err := s.repo.GetLatest(ctx, domain.CurrencyUSD)
	if err != nil {
		return nil, err
	}
	eur, err := s.repo.GetLatest(ctx, domain.CurrencyEUR)
	if err != nil {
		return nil, err
	}

	return map[string]*domain.ExchangeRate{
		domain.CurrencyUSD: usd,
		domain.CurrencyEUR: eur,
	}, nil
}

func (s *ExchangeRateService) SaveManualRate(ctx context.Context, currency string, rate float64) (*domain.ExchangeRate, error) {
	if currency != domain.CurrencyUSD && currency != domain.CurrencyEUR {
		return nil, errors.New("invalid currency")
	}

	r := &domain.ExchangeRate{
		ID:        uuid.New().String(),
		Currency:  currency,
		Rate:      rate,
		Source:    domain.SourceManual,
		CreatedAt: time.Now(),
	}

	if err := s.repo.Save(ctx, r); err != nil {
		return nil, err
	}

	return r, nil
}

func extractRate(html, id string) (float64, error) {
	// Look for <div id="dolar"... <strong> 41,2000000 </strong>
	// The regex pattern matches the div ID, and then looks for the next <strong> block.
	pattern := `id="` + id + `".*?<strong>(.*?)</strong>`
	re := regexp.MustCompile("(?s)" + pattern)
	matches := re.FindStringSubmatch(html)

	if len(matches) < 2 {
		return 0, errors.New("rate not found for " + id)
	}

	rateStr := strings.TrimSpace(matches[1])
	rateStr = strings.ReplaceAll(rateStr, ",", ".")

	rate, err := strconv.ParseFloat(rateStr, 64)
	if err != nil {
		return 0, err
	}

	return rate, nil
}
