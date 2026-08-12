package http

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=12"`
	FullName string `json:"full_name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type MFALoginRequest struct {
	MFATicket string `json:"mfa_ticket" binding:"required"`
	Code      string `json:"code" binding:"required,len=6"`
}

type TOTPCodeRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=12"`
}

type RequestPasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type VerifyPasswordResetOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required,len=6"`
}

type ResetPasswordRequest struct {
	Ticket      string `json:"reset_ticket" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=12"`
}

type CreatePurchaseRequest struct {
	PersonName   string  `json:"person_name" binding:"required"`
	OrderNumber  string  `json:"order_number"`
	Description  string  `json:"description" binding:"required"`
	ItemAmount   float64 `json:"item_amount" binding:"gte=0"`
	TaxAmount    float64 `json:"tax_amount" binding:"gte=0"`
	ShippingCost float64 `json:"shipping_cost" binding:"gte=0"`
	DetailPeriod string  `json:"detail_period"`
}

type UpdatePurchaseRequest struct {
	ItemAmount   float64 `json:"item_amount" binding:"gte=0"`
	TaxAmount    float64 `json:"tax_amount" binding:"gte=0"`
	ShippingCost float64 `json:"shipping_cost" binding:"gte=0"`
	InvoiceURL   string  `json:"invoice_url"`
	DetailPeriod string  `json:"detail_period"`
}

type CreatePackageRequest struct {
	TrackingNumber string  `json:"tracking_number" binding:"required"`
	ShippingCost   float64 `json:"shipping_cost" binding:"gte=0"`
}

type UpdatePackageRequest struct {
	ShippingCost       float64 `json:"shipping_cost" binding:"gte=0"`
	WarehouseReceived  bool    `json:"warehouse_received"`
	PersonallyReceived bool    `json:"personally_received"`
	DispatchDate       string  `json:"dispatch_date"`
}

type RecordPaymentRequest struct {
	PersonID   string  `json:"person_id" binding:"required"`
	AmountPaid float64 `json:"amount_paid" binding:"gt=0"`
	Notes      string  `json:"notes"`
}

type ReassignPurchaseRequest struct {
	PersonID string `json:"person_id" binding:"required"`
}
