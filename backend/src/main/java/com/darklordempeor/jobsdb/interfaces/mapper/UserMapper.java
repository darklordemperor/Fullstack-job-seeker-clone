package com.darklordempeor.jobsdb.interfaces.mapper;

import com.darklordempeor.jobsdb.domain.model.User;
import com.darklordempeor.jobsdb.interfaces.dto.response.UserResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
	default UserResponse toResponse(User user) {
		return new UserResponse(user.id(), user.email(), user.role().name(), user.banned(), user.createdAt());
	}
}
