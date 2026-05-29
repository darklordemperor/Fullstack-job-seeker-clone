package com.darklordempeor.jobsdb.interfaces.dto.response;

import java.time.Instant;

public record ApiResponse<T>(boolean success, T data, String message, String timestamp) {

	public static <T> ApiResponse<T> success(T data, String message) {
		return new ApiResponse<>(true, data, message, Instant.now().toString());
	}

	public static <T> ApiResponse<T> failure(String message) {
		return new ApiResponse<>(false, null, message, Instant.now().toString());
	}
}
