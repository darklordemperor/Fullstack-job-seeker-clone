package com.darklordempeor.jobsdb.interfaces.dto.response;

public record AuthResponse(String accessToken, String refreshToken, String tokenType) {
}
