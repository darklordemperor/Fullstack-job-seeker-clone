package com.darklordempeor.jobsdb.infrastructure.storage;

import com.darklordempeor.jobsdb.domain.exception.DomainException;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.assertj.core.api.Assertions.*;

class LocalProfileImageAdapterTest {
    @TempDir Path directory;
    @Test void cropsAndResizesToPngWithoutUsingTheClientPath() throws Exception {
        var source = new BufferedImage(400, 200, BufferedImage.TYPE_INT_RGB);
        var graphics = source.createGraphics();
        graphics.setColor(Color.RED); graphics.fillRect(0, 0, 400, 200); graphics.dispose();
        var bytes = new ByteArrayOutputStream(); ImageIO.write(source, "jpg", bytes);
        UUID user = UUID.randomUUID();
        String url = new LocalProfileImageAdapter(directory.toString()).store(user, "../../AVATAR.JPG", "image/jpeg", bytes.toByteArray());
        assertThat(url).startsWith("/uploads/profile-images/" + user).endsWith(".png");
        Path result = directory.resolve(url.substring("/uploads/".length())).normalize();
        assertThat(result).startsWith(directory);
        var avatar = ImageIO.read(result.toFile());
        assertThat(avatar.getWidth()).isEqualTo(256); assertThat(avatar.getHeight()).isEqualTo(256);
        assertThat(new Color(avatar.getRGB(128, 128)).getRed()).isGreaterThan(240);
    }
    @Test void rejectsEmptyOversizeWrongTypesAndUndecodableBytes() throws Exception {
        var adapter = new LocalProfileImageAdapter(directory.toString()); UUID user = UUID.randomUUID();
        assertThatThrownBy(() -> adapter.store(user, "a.png", "image/png", new byte[0])).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> adapter.store(user, "a.png", "image/png", new byte[5 * 1024 * 1024 + 1])).isInstanceOf(DomainException.class);
        for (String type : new String[] { null, "text/plain" })
            assertThatThrownBy(() -> adapter.store(user, "a.png", type, new byte[] {1})).isInstanceOf(DomainException.class);
        for (String name : new String[] { null, "no-extension", "avatar.svg" })
            assertThatThrownBy(() -> adapter.store(user, name, "image/png", new byte[] {1})).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> adapter.store(user, "a.png", "image/png", new byte[] {1})).hasMessage("Profile image could not be read");
        try (var paths = Files.walk(directory)) { assertThat(paths.filter(Files::isRegularFile)).isEmpty(); }
    }
    @Test void storageFailureReturnsADomainError() throws Exception {
        Path file = directory.resolve("file"); Files.writeString(file, "not a directory");
        assertThatThrownBy(() -> new LocalProfileImageAdapter(file.toString()).store(UUID.randomUUID(), "a.png", "image/png", new byte[] {1}))
            .isInstanceOf(DomainException.class).hasMessage("Could not save profile image");
    }
}
