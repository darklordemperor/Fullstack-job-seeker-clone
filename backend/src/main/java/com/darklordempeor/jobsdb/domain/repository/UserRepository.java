package com.darklordempeor.jobsdb.domain.repository;

import com.darklordempeor.jobsdb.domain.model.User;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository {
	User save(User user);
	Optional<User> findById(UUID id);
	Optional<User> findByEmail(String email);
	boolean existsByEmail(String email);
	long count();
	long countByRole(com.darklordempeor.jobsdb.domain.model.UserRole role);
	long countCreatedSince(Instant since);
	List<User> findAll();
}
