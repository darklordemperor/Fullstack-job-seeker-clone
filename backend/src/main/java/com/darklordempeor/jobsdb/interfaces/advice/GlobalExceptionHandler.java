package com.darklordempeor.jobsdb.interfaces.advice;

import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
	@ExceptionHandler(ResourceNotFoundException.class)
	@ResponseStatus(HttpStatus.NOT_FOUND)
	public ApiResponse<Void> notFound(ResourceNotFoundException ex) {
		return ApiResponse.failure(ex.getMessage());
	}

	@ExceptionHandler({DomainException.class, MethodArgumentNotValidException.class})
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public ApiResponse<Void> badRequest(Exception ex) {
		return ApiResponse.failure(ex.getMessage());
	}
}
