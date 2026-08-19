package http

import (
	"net/http"
	"strconv"
	"time"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"
	"github.com/gin-gonic/gin"
)

type CatExpenseHandler struct {
	useCase ports.CatExpenseUseCase
}

func NewCatExpenseHandler(useCase ports.CatExpenseUseCase) *CatExpenseHandler {
	return &CatExpenseHandler{useCase: useCase}
}

type CreateCatExpenseRequest struct {
	ItemName       string    `json:"item_name" binding:"required"`
	Platform       string    `json:"platform" binding:"required"`
	PaymentMethod  string    `json:"payment_method" binding:"required"`
	AmountUSD      float64   `json:"amount_usd" binding:"required,gt=0"`
	AmountVEF      *float64  `json:"amount_vef"`
	ExchangeRateID *string   `json:"exchange_rate_id"`
	ExpenseDate    time.Time `json:"expense_date" binding:"required"`
}

func (h *CatExpenseHandler) Create(c *gin.Context) {
	var req CreateCatExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := c.Get("user")
	currentUser := user.(*domain.User)

	expense := &domain.CatExpense{
		ItemName:       req.ItemName,
		Platform:       req.Platform,
		PaymentMethod:  req.PaymentMethod,
		AmountUSD:      req.AmountUSD,
		AmountVEF:      req.AmountVEF,
		ExchangeRateID: req.ExchangeRateID,
		ExpenseDate:    req.ExpenseDate,
	}

	if err := h.useCase.CreateExpense(c.Request.Context(), currentUser.ID, expense); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create cat expense"})
		return
	}

	c.JSON(http.StatusCreated, expense)
}

func (h *CatExpenseHandler) List(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	expenses, err := h.useCase.ListExpenses(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list cat expenses"})
		return
	}

	c.JSON(http.StatusOK, expenses)
}

func (h *CatExpenseHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req CreateCatExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	expense := &domain.CatExpense{
		ID:             id,
		ItemName:       req.ItemName,
		Platform:       req.Platform,
		PaymentMethod:  req.PaymentMethod,
		AmountUSD:      req.AmountUSD,
		AmountVEF:      req.AmountVEF,
		ExchangeRateID: req.ExchangeRateID,
		ExpenseDate:    req.ExpenseDate,
	}

	if err := h.useCase.UpdateExpense(c.Request.Context(), expense); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update cat expense"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func (h *CatExpenseHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.useCase.DeleteExpense(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete cat expense"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
