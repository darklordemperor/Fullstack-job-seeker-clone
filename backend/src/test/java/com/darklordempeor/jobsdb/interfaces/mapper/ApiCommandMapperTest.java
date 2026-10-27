package com.darklordempeor.jobsdb.interfaces.mapper;

import com.darklordempeor.jobsdb.interfaces.dto.request.*;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import static org.assertj.core.api.Assertions.assertThat;

class ApiCommandMapperTest {
    private final ApiCommandMapper mapper = Mappers.getMapper(ApiCommandMapper.class);

    @Test void mapsNestedProfileAndSalaryIntoApplicationOwnedValues() {
        var date = LocalDate.of(2020, 1, 2);
        var request = new JobSeekerProfileRequest("Alex", "123", date, "Thai", "Bangkok", "Summary", 100, 200, "THB",
                List.of(new SkillRequest("Java", 3, "Advanced")),
                List.of(new WorkExperienceRequest("Company", "Engineer", date, null, "Built APIs")),
                List.of(new EducationRequest("University", "BS", "Computing", 2020)),
                List.of(new LanguageRequest("English", "Fluent")),
                List.of(new LicenseRequest("Certificate", "Issuer", 2021, 2027, "Detail")), "https://example.com/cv");
        var command = mapper.toCommand(request);
        assertThat(command.fullName()).isEqualTo("Alex");
        assertThat(command.dateOfBirth()).isEqualTo(date);
        assertThat(command.expectedSalaryMin()).isEqualTo(100);
        assertThat(command.expectedSalaryMax()).isEqualTo(200);
        assertThat(command.skills().getFirst().yearsOfExperience()).isEqualTo(3);
        assertThat(command.workExperiences().getFirst().startDate()).isEqualTo(date);
        assertThat(command.workExperiences().getFirst().endDate()).isNull();
        assertThat(command.educations().getFirst().institution()).isEqualTo("University");
        assertThat(command.languages().getFirst().proficiency()).isEqualTo("Fluent");
        assertThat(command.licenses().getFirst().expiresYear()).isEqualTo(2027);
        assertThat(command.resumeUrl()).isEqualTo(request.resumeUrl());
    }
}
