package com.darklordempeor.jobsdb.interfaces.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ApiResponseTest {

	@Test
	void successFactoryBuildsEnvelopeWithTimestamp() {
		ApiResponse<String> response = ApiResponse.success("token", "Logged in");

		assertThat(response.success()).isTrue();
		assertThat(response.data()).isEqualTo("token");
		assertThat(response.message()).isEqualTo("Logged in");
		assertThat(response.timestamp()).isNotBlank();
	}

	@Test
	void pagedResponseCarriesPaginationMetadata() {
		PagedResponse<String> response = new PagedResponse<>(java.util.List.of("job"), 1, 1, 0);

		assertThat(response.content()).containsExactly("job");
		assertThat(response.totalElements()).isEqualTo(1);
		assertThat(response.totalPages()).isEqualTo(1);
		assertThat(response.page()).isZero();
	}
}
