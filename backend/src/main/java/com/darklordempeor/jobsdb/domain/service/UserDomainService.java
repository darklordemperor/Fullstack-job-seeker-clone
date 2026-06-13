package com.darklordempeor.jobsdb.domain.service;

import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.domain.repository.UserRepository;

public class UserDomainService {
	public void ensureEmailAvailable(UserRepository users, String email) {
		if (users.existsByEmail(email)) {
			throw new DomainException("Email is already registered");
		}
	}
}
