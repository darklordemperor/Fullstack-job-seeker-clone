package com.darklordempeor.jobsdb.interfaces.advice;

import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(com.darklordempeor.jobsdb.domain.exception.UnauthorizedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiResponse<Void> unauthorized(Exception ex) { return ApiResponse.failure(ex.getMessage()); }

    @ExceptionHandler(com.darklordempeor.jobsdb.domain.exception.ForbiddenException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> forbidden(Exception ex) { return ApiResponse.failure(ex.getMessage()); }

    @ExceptionHandler(com.darklordempeor.jobsdb.domain.exception.ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> conflict(Exception ex) { return ApiResponse.failure(ex.getMessage()); }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> constraintViolation() { return ApiResponse.failure("This operation conflicts with an existing record"); }

    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
        org.springframework.web.multipart.support.MissingServletRequestPartException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> malformedRequest() { return ApiResponse.failure("Invalid request value or format"); }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> validation(MethodArgumentNotValidException ex) {
        return ApiResponse.failure(ex.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage()).distinct().collect(java.util.stream.Collectors.joining("; ")));
    }
	@ExceptionHandler(ResourceNotFoundException.class)
	@ResponseStatus(HttpStatus.NOT_FOUND)
	public ApiResponse<Void> notFound(ResourceNotFoundException ex) {
		return ApiResponse.failure(ex.getMessage());
	}

	@ExceptionHandler(DomainException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public ApiResponse<Void> badRequest(Exception ex) {
		return ApiResponse.failure(ex.getMessage());
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	@ResponseStatus(HttpStatus.PAYLOAD_TOO_LARGE)
	public ApiResponse<Void> imageTooLarge() {
		return ApiResponse.failure("Uploaded file must be 5 MB or smaller");
	}
}
