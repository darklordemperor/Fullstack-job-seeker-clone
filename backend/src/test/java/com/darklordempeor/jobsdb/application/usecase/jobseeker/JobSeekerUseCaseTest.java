package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.darklordempeor.jobsdb.application.port.JobSeekerProfilePort;
import com.darklordempeor.jobsdb.application.port.ProfileImagePort;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobSeekerProfileRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobSeekerUseCaseTest {
	@Mock
	private JobSeekerProfilePort profiles;
	@Mock
	private ProfileImagePort profileImages;
	private JobSeekerUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new JobSeekerUseCase(profiles, profileImages);
	}

	@Test
	void profileDelegatesToPort() {
		UUID userId = UUID.randomUUID();
		Map<String, Object> expected = Map.of("userId", userId);
		when(profiles.findOrCreate(userId)).thenReturn(expected);

		assertThat(useCase.profile(userId)).isSameAs(expected);
		verify(profiles).findOrCreate(userId);
	}

	@Test
	void updateProfileDelegatesToPort() {
		UUID userId = UUID.randomUUID();
		JobSeekerProfileRequest request = request();
		Map<String, Object> expected = Map.of("userId", userId);
		when(profiles.update(userId, request)).thenReturn(expected);

		assertThat(useCase.updateProfile(userId, request)).isSameAs(expected);
		verify(profiles).update(userId, request);
	}

	@Test
	void uploadProfileImageStoresImageThenUpdatesProfile() {
		UUID userId = UUID.randomUUID();
		byte[] bytes = { 1, 2, 3 };
		Map<String, Object> expected = Map.of("profileImageUrl", "/uploads/avatar.png");
		when(profileImages.store(userId, "avatar.jpg", "image/jpeg", bytes)).thenReturn("/uploads/avatar.png");
		when(profiles.updateImage(userId, "/uploads/avatar.png")).thenReturn(expected);

		assertThat(useCase.uploadProfileImage(userId, "avatar.jpg", "image/jpeg", bytes)).isSameAs(expected);

		InOrder inOrder = inOrder(profileImages, profiles);
		inOrder.verify(profileImages).store(userId, "avatar.jpg", "image/jpeg", bytes);
		inOrder.verify(profiles).updateImage(userId, "/uploads/avatar.png");
	}

	private JobSeekerProfileRequest request() {
		return new JobSeekerProfileRequest("Name", "0123", null, "Thai", "Bangkok", "Summary", 100, 200, "THB",
				List.of(), List.of(), List.of(), List.of(), List.of(), "resume");
	}
}
