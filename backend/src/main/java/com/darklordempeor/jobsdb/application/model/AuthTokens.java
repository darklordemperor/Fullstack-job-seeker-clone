package com.darklordempeor.jobsdb.application.model;

public record AuthTokens(String accessToken, String refreshToken, String tokenType) {
}
