package http

import (
	"net/http"

	"debtcontrol/backend/internal/core/ports"
	"github.com/gin-gonic/gin"
)

type ExchangeRateHandler struct {
	useCase ports.ExchangeRateUseCase
}

func NewExchangeRateHandler(useCase ports.ExchangeRateUseCase) *ExchangeRateHandler {
	return &ExchangeRateHandler{useCase: useCase}
}

func (h *ExchangeRateHandler) GetLatest(c *gin.Context) {
	rates, err := h.useCase.GetLatestRates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get latest rates"})
		return
	}
	c.JSON(http.StatusOK, rates)
}

func (h *ExchangeRateHandler) FetchBCV(c *gin.Context) {
	rates, err := h.useCase.FetchAndSaveBCVRates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch BCV rates"})
		return
	}
	c.JSON(http.StatusOK, rates)
}

type SaveManualRateRequest struct {
	Currency string  `json:"currency" binding:"required"`
	Rate     float64 `json:"rate" binding:"required,gt=0"`
}

func (h *ExchangeRateHandler) SaveManual(c *gin.Context) {
	var req SaveManualRateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rate, err := h.useCase.SaveManualRate(c.Request.Context(), req.Currency, req.Rate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save manual rate"})
		return
	}

	c.JSON(http.StatusOK, rate)
}
