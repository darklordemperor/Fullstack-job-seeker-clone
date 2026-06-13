package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.domain.model.User;

public interface JwtPort {
	String createAccessToken(User user);
	String createRefreshToken(User user);
}
