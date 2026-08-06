package postgres

import (
	"context"

	"debtcontrol/backend/internal/core/ports"

	"gorm.io/gorm"
)

// OrderSearchRepository is a narrow adapter owning the full-text order search.
// It lives on its own seam so the DebtRepository does not need to expose raw
// SQL to consumers.
type OrderSearchRepository struct {
	databaseConnection *gorm.DB
}

func NewOrderSearchRepository(databaseConnection *gorm.DB) *OrderSearchRepository {
	return &OrderSearchRepository{
		databaseConnection: databaseConnection,
	}
}

func (repository *OrderSearchRepository) SearchOrders(ctx context.Context, query string, personIDs []string, limit int) ([]*ports.SearchResult, error) {
	if limit <= 0 {
		limit = 10
	}

	searchQuery := "%" + query + "%"

	sqlQuery := `
		SELECT DISTINCT ON (pi.id)
			pi.id AS purchase_id,
			pi.person_name,
			pi.order_number,
			pi.description,
			pi.total_cost,
			sp.tracking_number
		FROM purchase_items pi
		LEFT JOIN shipping_packages sp ON pi.id = sp.purchase_item_id AND sp.deleted_at IS NULL
		WHERE pi.deleted_at IS NULL AND (pi.order_number ILIKE ? OR sp.tracking_number ILIKE ?)
	`
	args := []interface{}{searchQuery, searchQuery}

	if len(personIDs) > 0 {
		sqlQuery += " AND pi.person_id IN ?"
		args = append(args, personIDs)
	}

	sqlQuery += " ORDER BY pi.id, pi.created_at DESC LIMIT ?"
	args = append(args, limit)

	rows, err := repository.databaseConnection.WithContext(ctx).Raw(sqlQuery, args...).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*ports.SearchResult
	for rows.Next() {
		var res ports.SearchResult
		var trackingNumber *string
		if err := rows.Scan(&res.PurchaseID, &res.PersonName, &res.OrderNumber, &res.Description, &res.TotalCost, &trackingNumber); err != nil {
			return nil, err
		}
		if trackingNumber != nil {
			res.TrackingNumber = *trackingNumber
		}
		results = append(results, &res)
	}

	return results, nil
}