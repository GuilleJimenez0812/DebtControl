package services

import (
	"context"

	"debtcontrol/backend/internal/core/domain"
	"debtcontrol/backend/internal/core/ports"
	"debtcontrol/backend/pkg/security"

	"github.com/google/uuid"
)

type AdminService struct {
	userRepo ports.UserRepository
	debtRepo ports.DebtRepository
}

func NewAdminService(userRepo ports.UserRepository, debtRepo ports.DebtRepository) *AdminService {
	return &AdminService{
		userRepo: userRepo,
		debtRepo: debtRepo,
	}
}

func (service *AdminService) CreateUser(ctx context.Context, email string, password string, fullName string, role string) (*domain.User, error) {
	existingUser, err := service.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, domain.ErrUserAlreadyExists
	}

	hashedPassword, err := security.HashPassword(password)
	if err != nil {
		return nil, err
	}

	assignedRole := domain.RoleUser
	if role == string(domain.RoleAdmin) {
		assignedRole = domain.RoleAdmin
	}

	userID := uuid.New().String()
	newUser, err := domain.NewUser(userID, email, hashedPassword, fullName, assignedRole)
	if err != nil {
		return nil, err
	}

	err = service.userRepo.Create(ctx, newUser)
	if err != nil {
		return nil, err
	}

	return newUser, nil
}

func (service *AdminService) ListUsersWithPersons(ctx context.Context) ([]*ports.UserWithPersons, error) {
	users, err := service.userRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	allPersons, err := service.debtRepo.FindAllPersons(ctx)
	if err != nil {
		return nil, err
	}

	personMap := make(map[string]*domain.Person)
	for _, person := range allPersons {
		personMap[person.ID] = person
	}

	result := make([]*ports.UserWithPersons, len(users))
	for index, user := range users {
		assignedIDs, _ := service.userRepo.GetAssignedPersonIDs(ctx, user.ID)
		assignedPersons := make([]*domain.Person, 0)
		for _, id := range assignedIDs {
			if person, exists := personMap[id]; exists {
				assignedPersons = append(assignedPersons, person)
			}
		}

		result[index] = &ports.UserWithPersons{
			User:            user,
			AssignedPersons: assignedPersons,
			AssignedIDs:     assignedIDs,
		}
	}

	return result, nil
}

func (service *AdminService) AssignPersonsToUser(ctx context.Context, userID string, personIDs []string) error {
	user, err := service.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return domain.ErrUserNotFound
	}

	return service.userRepo.AssignPersonsToUser(ctx, userID, personIDs)
}


func (s *AdminService) AssignModulesToUser(ctx context.Context, userID string, modules []string) error {
	_, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	return s.userRepo.AssignModulesToUser(ctx, userID, modules)
}


func (s *AdminService) GetAssignedModules(ctx context.Context, userID string) ([]string, error) {
	_, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.userRepo.GetAssignedModules(ctx, userID)
}
