package com.darklordempeor.jobsdb.infrastructure.storage;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadResourceConfig implements WebMvcConfigurer {
	private final Path uploadDirectory;

	public UploadResourceConfig(@Value("${uploads.directory:uploads}") String uploadDirectory) {
		this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/uploads/**")
				.addResourceLocations(uploadDirectory.toUri().toString());
	}
}
