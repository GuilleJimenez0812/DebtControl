package postgres

import (
	"context"
	"errors"

	"debtcontrol/backend/internal/core/domain"

	"gorm.io/gorm"
)

type UserRepository struct {
	databaseConnection *gorm.DB
}

func NewUserRepository(databaseConnection *gorm.DB) *UserRepository {
	return &UserRepository{
		databaseConnection: databaseConnection,
	}
}

func (repository *UserRepository) Create(ctx context.Context, user *domain.User) error {
	emailHash, err := blindIndex(user.Email)
	if err != nil {
		return err
	}

	model := UserModel{
		ID:           user.ID,
		Email:        user.Email,
		EmailHash:    emailHash,
		PasswordHash: user.PasswordHash,
		FullName:     user.FullName,
		Role:         string(user.Role),
		TOTPSecret:   user.TOTPSecret,
		TOTPEnabled:  user.TOTPEnabled,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}

	err = repository.databaseConnection.WithContext(ctx).Create(&model).Error
	if err != nil {
		return err
	}

	_ = repository.EnsureFirstUserIsAdmin(ctx)
	return nil
}

func (repository *UserRepository) Update(ctx context.Context, user *domain.User) error {
	result := repository.databaseConnection.WithContext(ctx).
		Model(&UserModel{}).
		Where("id = ?", user.ID).
		Updates(map[string]interface{}{
			"password_hash": user.PasswordHash,
			"role":          string(user.Role),
			"totp_secret":   user.TOTPSecret,
			"totp_enabled":  user.TOTPEnabled,
			"updated_at":    user.UpdatedAt,
		})
	return result.Error
}

func (repository *UserRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	_ = repository.EnsureFirstUserIsAdmin(ctx)

	emailHash, err := blindIndex(email)
	if err != nil {
		return nil, err
	}

	var model UserModel
	err = repository.databaseConnection.WithContext(ctx).Where("email_hash = ?", emailHash).Preload("Modules").First(&model).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	
	modules := make([]string, len(model.Modules))
	for i, mod := range model.Modules {
		modules[i] = mod.ModuleName
	}

	return &domain.User{
		ID:           model.ID,
		Email:        model.Email,
		PasswordHash: model.PasswordHash,
		FullName:     model.FullName,
		Role:         domain.Role(model.Role),
		TOTPSecret:   model.TOTPSecret,
		TOTPEnabled:  model.TOTPEnabled,
		Modules:      modules,
		CreatedAt:    model.CreatedAt,
		UpdatedAt:    model.UpdatedAt,
	}, nil
}

func (repository *UserRepository) FindByID(ctx context.Context, id string) (*domain.User, error) {
	_ = repository.EnsureFirstUserIsAdmin(ctx)

	var model UserModel
	err := repository.databaseConnection.WithContext(ctx).Where("id = ?", id).Preload("Modules").First(&model).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	
	modules := make([]string, len(model.Modules))
	for i, mod := range model.Modules {
		modules[i] = mod.ModuleName
	}

	return &domain.User{
		ID:           model.ID,
		Email:        model.Email,
		PasswordHash: model.PasswordHash,
		FullName:     model.FullName,
		Role:         domain.Role(model.Role),
		TOTPSecret:   model.TOTPSecret,
		TOTPEnabled:  model.TOTPEnabled,
		Modules:      modules,
		CreatedAt:    model.CreatedAt,
		UpdatedAt:    model.UpdatedAt,
	}, nil
}

func (repository *UserRepository) FindAll(ctx context.Context) ([]*domain.User, error) {
	_ = repository.EnsureFirstUserIsAdmin(ctx)

	var models []UserModel
	err := repository.databaseConnection.WithContext(ctx).Preload("Modules").Order("created_at ASC").Find(&models).Error
	if err != nil {
		return nil, err
	}


	users := make([]*domain.User, len(models))
	for index, model := range models {
		modules := make([]string, len(model.Modules))
		for i, mod := range model.Modules {
			modules[i] = mod.ModuleName
		}
		users[index] = &domain.User{
			ID:           model.ID,
			Email:        model.Email,
			PasswordHash: model.PasswordHash,
			FullName:     model.FullName,
			Role:         domain.Role(model.Role),
			TOTPSecret:   model.TOTPSecret,
			TOTPEnabled:  model.TOTPEnabled,
		Modules:      modules,
			CreatedAt:    model.CreatedAt,
			UpdatedAt:    model.UpdatedAt,
		}
	}
	return users, nil
}

func (repository *UserRepository) EnsureFirstUserIsAdmin(ctx context.Context) error {
	var count int64
	err := repository.databaseConnection.WithContext(ctx).Model(&UserModel{}).Count(&count).Error
	if err != nil || count == 0 {
		return err
	}

	var firstUser UserModel
	err = repository.databaseConnection.WithContext(ctx).Order("created_at ASC").Preload("Modules").First(&firstUser).Error
	if err != nil {
		return err
	}

	if firstUser.Role != string(domain.RoleAdmin) {
		return repository.databaseConnection.WithContext(ctx).Exec("UPDATE users SET role = ? WHERE id = ?", string(domain.RoleAdmin), firstUser.ID).Error
	}

	return nil
}

func (repository *UserRepository) AssignPersonsToUser(ctx context.Context, userID string, personIDs []string) error {
	return repository.databaseConnection.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", userID).Delete(&UserPersonModel{}).Error; err != nil {
			return err
		}

		for _, personID := range personIDs {
			userPerson := UserPersonModel{
				UserID:   userID,
				PersonID: personID,
			}
			if err := tx.Create(&userPerson).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (repository *UserRepository) GetAssignedPersonIDs(ctx context.Context, userID string) ([]string, error) {
	var models []UserPersonModel
	err := repository.databaseConnection.WithContext(ctx).Where("user_id = ?", userID).Find(&models).Error
	if err != nil {
		return nil, err
	}

	personIDs := make([]string, len(models))
	for index, model := range models {
		personIDs[index] = model.PersonID
	}
	return personIDs, nil
}

func (repository *UserRepository) AssignModulesToUser(ctx context.Context, userID string, modules []string) error {
	return repository.databaseConnection.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", userID).Delete(&UserModuleModel{}).Error; err != nil {
			return err
		}

		for _, mod := range modules {
			userModule := UserModuleModel{
				UserID:     userID,
				ModuleName: mod,
			}
			if err := tx.Create(&userModule).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (repository *UserRepository) GetAssignedModules(ctx context.Context, userID string) ([]string, error) {
	var models []UserModuleModel
	err := repository.databaseConnection.WithContext(ctx).Where("user_id = ?", userID).Find(&models).Error
	if err != nil {
		return nil, err
	}

	modules := make([]string, len(models))
	for index, model := range models {
		modules[index] = model.ModuleName
	}
	return modules, nil
}
