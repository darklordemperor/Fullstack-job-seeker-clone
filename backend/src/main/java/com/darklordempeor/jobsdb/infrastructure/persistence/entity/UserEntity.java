package com.darklordempeor.jobsdb.infrastructure.persistence.entity;

import com.darklordempeor.jobsdb.domain.model.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class UserEntity {
	@Id
	private UUID id;
	@Column(nullable = false, unique = true)
	private String email;
	@Column(name = "password_hash", nullable = false)
	private String passwordHash;
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private UserRole role;
	@Column(nullable = false)
	private boolean banned;
	@Column(name = "created_at", nullable = false)
	private Instant createdAt;
}
