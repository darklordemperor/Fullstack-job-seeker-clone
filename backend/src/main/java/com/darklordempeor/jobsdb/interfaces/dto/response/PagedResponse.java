package com.darklordempeor.jobsdb.interfaces.dto.response;

import java.util.List;

public record PagedResponse<T>(List<T> content, long totalElements, int totalPages, int page) {
}
