package http

import (
	"net/http"

	"debtcontrol/backend/internal/core/ports"

	"github.com/gin-gonic/gin"
)

type DebtHandler struct {
	debtUseCase ports.DebtUseCase
}

func NewDebtHandler(debtUseCase ports.DebtUseCase) *DebtHandler {
	return &DebtHandler{
		debtUseCase: debtUseCase,
	}
}

func (handler *DebtHandler) GetDashboardSummary(ginContext *gin.Context) {
	summary, err := handler.debtUseCase.GetDashboardSummary(ginContext.Request.Context())
	if err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ginContext.JSON(http.StatusOK, summary)
}

func (handler *DebtHandler) ListPersons(ginContext *gin.Context) {
	persons, err := handler.debtUseCase.ListPersons(ginContext.Request.Context())
	if err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ginContext.JSON(http.StatusOK, gin.H{"persons": persons})
}

func (handler *DebtHandler) CreatePurchase(ginContext *gin.Context) {
	var requestPayload CreatePurchaseRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	purchase, err := handler.debtUseCase.CreatePurchaseItem(
		ginContext.Request.Context(),
		requestPayload.PersonName,
		requestPayload.OrderNumber,
		requestPayload.Description,
		requestPayload.ItemAmount,
		requestPayload.TaxAmount,
		requestPayload.ShippingCost,
		requestPayload.DetailPeriod,
	)

	if err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusCreated, gin.H{
		"message":  "purchase item recorded successfully",
		"purchase": purchase,
	})
}

func (handler *DebtHandler) UpdatePurchase(ginContext *gin.Context) {
	id := ginContext.Param("id")
	var requestPayload UpdatePurchaseRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	purchase, err := handler.debtUseCase.UpdatePurchaseItem(
		ginContext.Request.Context(),
		id,
		requestPayload.ItemAmount,
		requestPayload.TaxAmount,
		requestPayload.ShippingCost,
		requestPayload.InvoiceURL,
	)

	if err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusOK, gin.H{
		"message":  "purchase item updated successfully",
		"purchase": purchase,
	})
}

func (handler *DebtHandler) UpdatePackage(ginContext *gin.Context) {
	id := ginContext.Param("id")
	var requestPayload UpdatePackageRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pkg, err := handler.debtUseCase.UpdateShippingPackage(
		ginContext.Request.Context(),
		id,
		requestPayload.ShippingCost,
		requestPayload.WarehouseReceived,
		requestPayload.PersonallyReceived,
		requestPayload.DispatchDate,
	)

	if err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusOK, gin.H{
		"message": "shipping package updated successfully",
		"package": pkg,
	})
}

func (handler *DebtHandler) RecordPayment(ginContext *gin.Context) {
	var requestPayload RecordPaymentRequest
	if err := ginContext.ShouldBindJSON(&requestPayload); err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payment, err := handler.debtUseCase.RecordPayment(
		ginContext.Request.Context(),
		requestPayload.PersonID,
		requestPayload.AmountPaid,
		requestPayload.Notes,
	)

	if err != nil {
		ginContext.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ginContext.JSON(http.StatusOK, gin.H{
		"message": "payment recorded successfully",
		"payment": payment,
	})
}

func (handler *DebtHandler) SeedData(ginContext *gin.Context) {
	err := handler.debtUseCase.SeedInitialSpreadsheetData(ginContext.Request.Context())
	if err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ginContext.JSON(http.StatusOK, gin.H{"message": "initial spreadsheet data seeded successfully"})
}
