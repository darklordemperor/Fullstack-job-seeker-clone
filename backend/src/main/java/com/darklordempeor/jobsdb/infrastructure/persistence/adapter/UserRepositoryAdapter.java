package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.domain.model.User;
import com.darklordempeor.jobsdb.domain.model.UserRole;
import com.darklordempeor.jobsdb.domain.repository.UserRepository;
import com.darklordempeor.jobsdb.infrastructure.persistence.entity.UserEntity;
import com.darklordempeor.jobsdb.infrastructure.persistence.repository.JpaUserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepositoryAdapter implements UserRepository {
	private final JpaUserRepository users;

	public UserRepositoryAdapter(JpaUserRepository users) {
		this.users = users;
	}

	@Override
	public User save(User user) {
		return toDomain(users.save(toEntity(user)));
	}

	@Override
	public Optional<User> findById(UUID id) {
		return users.findById(id).map(this::toDomain);
	}

	@Override
	public Optional<User> findByEmail(String email) {
		return users.findByEmail(email).map(this::toDomain);
	}

	@Override
	public boolean existsByEmail(String email) {
		return users.existsByEmail(email);
	}

	@Override
	public long count() {
		return users.count();
	}

	@Override
	public long countByRole(UserRole role) {
		return users.countByRole(role);
	}

	@Override
	public long countCreatedSince(Instant since) {
		return users.countByCreatedAtAfter(since);
	}

	@Override
	public List<User> findAll() {
		return users.findAll().stream().map(this::toDomain).toList();
	}

	private User toDomain(UserEntity entity) {
		return new User(entity.getId(), entity.getEmail(), entity.getPasswordHash(), entity.getRole(), entity.isBanned(), entity.getCreatedAt());
	}

	private UserEntity toEntity(User user) {
		UserEntity entity = new UserEntity();
		entity.setId(user.id());
		entity.setEmail(user.email());
		entity.setPasswordHash(user.passwordHash());
		entity.setRole(user.role());
		entity.setBanned(user.banned());
		entity.setCreatedAt(user.createdAt());
		return entity;
	}
}
