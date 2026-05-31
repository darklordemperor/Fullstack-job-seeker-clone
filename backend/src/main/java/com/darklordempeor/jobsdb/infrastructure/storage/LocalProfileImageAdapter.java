package com.darklordempeor.jobsdb.infrastructure.storage;

import com.darklordempeor.jobsdb.application.port.ProfileImagePort;
import com.darklordempeor.jobsdb.domain.exception.DomainException;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class LocalProfileImageAdapter implements ProfileImagePort {
	private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
	private static final int AVATAR_SIZE = 256;
	private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png");
	private final Path uploadDirectory;

	public LocalProfileImageAdapter(@Value("${uploads.directory:uploads}") String uploadDirectory) {
		this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
	}

	@Override
	public String store(UUID userId, String originalFilename, String contentType, byte[] bytes) {
		if (bytes.length == 0 || bytes.length > MAX_IMAGE_BYTES) {
			throw new DomainException("Profile image must be between 1 byte and 5 MB");
		}
		if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
			throw new DomainException("Profile image must be an image file");
		}
		String extension = extension(originalFilename);
		if (!ALLOWED_EXTENSIONS.contains(extension)) {
			throw new DomainException("Profile image must be JPG or PNG");
		}
		try {
			Path profileImages = uploadDirectory.resolve("profile-images");
			Files.createDirectories(profileImages);
			String filename = userId + "-" + UUID.randomUUID() + ".png";
			Files.write(profileImages.resolve(filename), resizeAvatar(bytes), StandardOpenOption.CREATE_NEW);
			return "/uploads/profile-images/" + filename;
		} catch (IOException ex) {
			throw new DomainException("Could not save profile image");
		}
	}

	private byte[] resizeAvatar(byte[] bytes) throws IOException {
		BufferedImage source = ImageIO.read(new ByteArrayInputStream(bytes));
		if (source == null) {
			throw new DomainException("Profile image could not be read");
		}
		int cropSize = Math.min(source.getWidth(), source.getHeight());
		int cropX = (source.getWidth() - cropSize) / 2;
		int cropY = (source.getHeight() - cropSize) / 2;
		BufferedImage avatar = new BufferedImage(AVATAR_SIZE, AVATAR_SIZE, BufferedImage.TYPE_INT_ARGB);
		Graphics2D graphics = avatar.createGraphics();
		try {
			graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
			graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			graphics.drawImage(source, 0, 0, AVATAR_SIZE, AVATAR_SIZE, cropX, cropY, cropX + cropSize, cropY + cropSize, null);
		} finally {
			graphics.dispose();
		}
		ByteArrayOutputStream output = new ByteArrayOutputStream();
		if (!ImageIO.write(avatar, "png", output)) {
			throw new DomainException("Profile image could not be resized");
		}
		return output.toByteArray();
	}

	private String extension(String originalFilename) {
		if (originalFilename == null) {
			return "";
		}
		String lowerName = originalFilename.toLowerCase(Locale.ROOT);
		int dot = lowerName.lastIndexOf('.');
		return dot < 0 ? "" : lowerName.substring(dot);
	}
}
