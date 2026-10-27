package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.port.JobSeekerProfilePort;
import com.darklordempeor.jobsdb.application.model.HiringModels.Education;
import com.darklordempeor.jobsdb.application.model.JobSeekerProfileCommand;
import com.darklordempeor.jobsdb.application.model.HiringModels.Language;
import com.darklordempeor.jobsdb.application.model.HiringModels.License;
import com.darklordempeor.jobsdb.application.model.HiringModels.Skill;
import com.darklordempeor.jobsdb.application.model.HiringModels.Experience;
import com.darklordempeor.jobsdb.application.model.HiringModels.Profile;
import tools.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JdbcJobSeekerProfileAdapter implements JobSeekerProfilePort {
	private final JdbcTemplate jdbc;
    private final ObjectMapper json;

	public JdbcJobSeekerProfileAdapter(JdbcTemplate jdbc, ObjectMapper json) {
		this.jdbc = jdbc;
        this.json = json;
	}

	@Override
	@Transactional
	public Profile findOrCreate(UUID userId) {
		UUID profileId = ensureProfile(userId);
		return json.convertValue(load(userId, profileId), Profile.class);
	}

	@Override
	@Transactional
	public Profile update(UUID userId, JobSeekerProfileCommand request) {
		UUID profileId = ensureProfile(userId);
		jdbc.update("""
				update job_seeker_profiles
				set full_name = ?, phone = ?, date_of_birth = ?, nationality = ?, location = ?, summary = ?,
					expected_salary_min = ?, expected_salary_max = ?, salary_currency = ?, resume_url = ?, updated_at = now()
				where id = ?
				""",
				request.fullName(), request.phone(), request.dateOfBirth(), request.nationality(), request.location(),
				request.summary(), request.expectedSalaryMin(), request.expectedSalaryMax(), request.salaryCurrency(),
				request.resumeUrl(), profileId);
		replaceSkills(profileId, request.skills());
		replaceWorkExperiences(profileId, request.workExperiences());
		replaceEducations(profileId, request.educations());
		replaceLanguages(profileId, request.languages());
		replaceLicenses(profileId, request.licenses());
		return json.convertValue(load(userId, profileId), Profile.class);
	}

	@Override
	@Transactional
	public Profile updateImage(UUID userId, String profileImageUrl) {
		UUID profileId = ensureProfile(userId);
		jdbc.update("update job_seeker_profiles set profile_image_url = ?, updated_at = now() where id = ?", profileImageUrl, profileId);
		return json.convertValue(load(userId, profileId), Profile.class);
	}

	private UUID ensureProfile(UUID userId) {
		jdbc.update("insert into job_seeker_profiles (user_id) values (?) on conflict (user_id) do nothing", userId);
		return jdbc.queryForObject("select id from job_seeker_profiles where user_id = ?", UUID.class, userId);
	}

	private Map<String, Object> load(UUID userId, UUID profileId) {
		Map<String, Object> profile = jdbc.queryForObject("""
				select full_name, phone, date_of_birth, nationality, location, summary,
					expected_salary_min, expected_salary_max, salary_currency, resume_url, profile_image_url
				from job_seeker_profiles where id = ?
				""", (rs, rowNum) -> profileRow(rs), profileId);
		profile.put("userId", userId);
		profile.put("skills", jdbc.query("select name, years_of_experience, level from skills where job_seeker_profile_id = ? order by name",
				(rs, rowNum) -> skillRow(rs), profileId));
		profile.put("workExperiences", jdbc.query("""
				select company, title, start_date, end_date, description from work_experiences
				where job_seeker_profile_id = ? order by start_date desc nulls last
				""", (rs, rowNum) -> workExperienceRow(rs), profileId));
		profile.put("educations", jdbc.query("""
				select institution, degree, field_of_study, graduation_year from educations
				where job_seeker_profile_id = ? order by graduation_year desc nulls last
				""", (rs, rowNum) -> educationRow(rs), profileId));
		profile.put("languages", jdbc.query("select language, proficiency from languages where job_seeker_profile_id = ? order by language",
				(rs, rowNum) -> languageRow(rs), profileId));
		profile.put("licenses", jdbc.query("""
				select name, issuer, issued_year, expires_year, description from licenses
				where job_seeker_profile_id = ? order by issued_year desc nulls last
				""", (rs, rowNum) -> licenseRow(rs), profileId));
		return profile;
	}

	private Map<String, Object> profileRow(ResultSet rs) throws SQLException {
		Map<String, Object> profile = row();
		profile.put("fullName", rs.getString("full_name"));
		profile.put("phone", rs.getString("phone"));
		profile.put("dateOfBirth", rs.getObject("date_of_birth", LocalDate.class));
		profile.put("nationality", rs.getString("nationality"));
		profile.put("location", rs.getString("location"));
		profile.put("summary", rs.getString("summary"));
		Map<String, Object> expectedSalary = row();
		expectedSalary.put("min", rs.getObject("expected_salary_min", Integer.class));
		expectedSalary.put("max", rs.getObject("expected_salary_max", Integer.class));
		expectedSalary.put("currency", rs.getString("salary_currency"));
		profile.put("expectedSalary", expectedSalary);
		profile.put("resumeUrl", rs.getString("resume_url"));
		profile.put("profileImageUrl", rs.getString("profile_image_url"));
		return profile;
	}

	private Map<String, Object> skillRow(ResultSet rs) throws SQLException {
		Map<String, Object> item = row();
		item.put("name", rs.getString("name"));
		item.put("yearsOfExperience", rs.getObject("years_of_experience", Integer.class));
		item.put("level", rs.getString("level"));
		return item;
	}

	private Map<String, Object> workExperienceRow(ResultSet rs) throws SQLException {
		Map<String, Object> item = row();
		item.put("company", rs.getString("company"));
		item.put("title", rs.getString("title"));
		item.put("startDate", rs.getObject("start_date", LocalDate.class));
		item.put("endDate", rs.getObject("end_date", LocalDate.class));
		item.put("description", rs.getString("description"));
		return item;
	}

	private Map<String, Object> educationRow(ResultSet rs) throws SQLException {
		Map<String, Object> item = row();
		item.put("institution", rs.getString("institution"));
		item.put("degree", rs.getString("degree"));
		item.put("fieldOfStudy", rs.getString("field_of_study"));
		item.put("graduationYear", rs.getObject("graduation_year", Integer.class));
		return item;
	}

	private Map<String, Object> languageRow(ResultSet rs) throws SQLException {
		Map<String, Object> item = row();
		item.put("language", rs.getString("language"));
		item.put("proficiency", rs.getString("proficiency"));
		return item;
	}

	private Map<String, Object> licenseRow(ResultSet rs) throws SQLException {
		Map<String, Object> item = row();
		item.put("name", rs.getString("name"));
		item.put("issuer", rs.getString("issuer"));
		item.put("issuedYear", rs.getObject("issued_year", Integer.class));
		item.put("expiresYear", rs.getObject("expires_year", Integer.class));
		item.put("description", rs.getString("description"));
		return item;
	}

	private void replaceSkills(UUID profileId, List<Skill> skills) {
		jdbc.update("delete from skills where job_seeker_profile_id = ?", profileId);
		for (Skill skill : items(skills)) {
			jdbc.update("insert into skills (job_seeker_profile_id, name, years_of_experience, level) values (?, ?, ?, ?)",
					profileId, skill.name(), skill.yearsOfExperience(), skill.level());
		}
	}

	private void replaceWorkExperiences(UUID profileId, List<Experience> experiences) {
		jdbc.update("delete from work_experiences where job_seeker_profile_id = ?", profileId);
		for (Experience experience : items(experiences)) {
			jdbc.update("""
					insert into work_experiences (job_seeker_profile_id, company, title, start_date, end_date, description)
					values (?, ?, ?, ?, ?, ?)
					""", profileId, experience.company(), experience.title(), experience.startDate(), experience.endDate(), experience.description());
		}
	}

	private void replaceEducations(UUID profileId, List<Education> educations) {
		jdbc.update("delete from educations where job_seeker_profile_id = ?", profileId);
		for (Education education : items(educations)) {
			jdbc.update("""
					insert into educations (job_seeker_profile_id, institution, degree, field_of_study, graduation_year)
					values (?, ?, ?, ?, ?)
					""", profileId, education.institution(), education.degree(), education.fieldOfStudy(), education.graduationYear());
		}
	}

	private void replaceLanguages(UUID profileId, List<Language> languages) {
		jdbc.update("delete from languages where job_seeker_profile_id = ?", profileId);
		for (Language language : items(languages)) {
			jdbc.update("insert into languages (job_seeker_profile_id, language, proficiency) values (?, ?, ?)",
					profileId, language.language(), language.proficiency());
		}
	}

	private void replaceLicenses(UUID profileId, List<License> licenses) {
		jdbc.update("delete from licenses where job_seeker_profile_id = ?", profileId);
		for (License license : items(licenses)) {
			jdbc.update("""
					insert into licenses (job_seeker_profile_id, name, issuer, issued_year, expires_year, description)
					values (?, ?, ?, ?, ?, ?)
					""", profileId, license.name(), license.issuer(), license.issuedYear(), license.expiresYear(), license.description());
		}
	}

	private <T> List<T> items(List<T> values) {
		return values == null ? new ArrayList<>() : values;
	}

	private Map<String, Object> row() {
		return new LinkedHashMap<>();
	}
}
