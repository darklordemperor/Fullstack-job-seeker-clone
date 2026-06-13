package com.darklordempeor.jobsdb.infrastructure.persistence.repository;

import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.infrastructure.persistence.entity.JobEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaJobRepository extends JpaRepository<JobEntity, UUID> {
	List<JobEntity> findByEmployerId(UUID employerId);
	long countByStatus(JobStatus status);
	long countByCreatedAtAfter(Instant since);

	@Query("""
			select j from JobEntity j
			where j.status = 'ACTIVE'
			and (:query = ''
				or lower(j.title) like lower(concat('%', :query, '%'))
				or lower(j.description) like lower(concat('%', :query, '%')))
			and (:location = '' or lower(j.location) like lower(concat('%', :location, '%')))
			order by j.createdAt desc
			""")
	List<JobEntity> findPublicJobs(@Param("query") String query, @Param("location") String location, Pageable pageable);

	@Query("""
			select count(j) from JobEntity j
			where j.status = 'ACTIVE'
			and (:query = ''
				or lower(j.title) like lower(concat('%', :query, '%'))
				or lower(j.description) like lower(concat('%', :query, '%')))
			and (:location = '' or lower(j.location) like lower(concat('%', :location, '%')))
			""")
	long countPublicJobs(@Param("query") String query, @Param("location") String location);
}
