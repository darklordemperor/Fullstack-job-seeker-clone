package com.darklordempeor.jobsdb.architecture;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

/** Source dependency guard, including fully qualified references used without imports. */
class ArchitectureTest {
    private static final String BASE = "com.darklordempeor.jobsdb.";

    static List<String> violations(String layer, String source) {
        var forbidden = new ArrayList<String>();
        switch (layer) {
            case "domain" -> forbidden.addAll(List.of(BASE + "application.", BASE + "interfaces.", BASE + "infrastructure.", "org.springframework.", "jakarta.", "org.hibernate."));
            case "application" -> forbidden.addAll(List.of(BASE + "interfaces.", BASE + "infrastructure.", "org.springframework.security.", "org.springframework.web.", "org.springframework.jdbc.", "org.springframework.data.", "jakarta.persistence.", "tools.jackson."));
            case "interfaces" -> forbidden.addAll(List.of(BASE + "infrastructure.", BASE + "domain.repository.", BASE + "application.port.", "org.springframework.jdbc."));
            default -> { }
        }
        return forbidden.stream().filter(source::contains).toList();
    }

    @Test void productionSourcesRespectLayerBoundaries() throws Exception {
        Path root = Path.of("src/main/java/com/darklordempeor/jobsdb");
        var failures = new ArrayList<String>();
        try (var files = Files.walk(root)) {
            for (Path file : files.filter(p -> p.toString().endsWith(".java")).toList()) {
                String layer = root.relativize(file).getName(0).toString();
                for (String dependency : violations(layer, Files.readString(file))) failures.add(root.relativize(file) + " -> " + dependency);
            }
        }
        assertThat(failures).as("Inner layers cannot depend on HTTP or persistence implementations; controllers use use cases").isEmpty();
    }

    @Test void guardDetectsImportsAndFullyQualifiedReferences() {
        assertThat(violations("domain", "import org.springframework.stereotype.Service;")).isNotEmpty();
        assertThat(violations("application", "public " + BASE + "interfaces.dto.request.JobRequest input;")).isNotEmpty();
        assertThat(violations("interfaces", "import " + BASE + "application.port.JobSummaryPort;")).isNotEmpty();
        assertThat(violations("application", "import " + BASE + "domain.repository.JobRepository;")).isEmpty();
        // Explicit project convention: Spring lifecycle and transaction annotations remain in use cases.
        assertThat(violations("application", "import org.springframework.transaction.annotation.Transactional;")).isEmpty();
    }
}
