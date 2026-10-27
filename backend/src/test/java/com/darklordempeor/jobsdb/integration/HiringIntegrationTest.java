package com.darklordempeor.jobsdb.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="JOBSDB_INTEGRATION_TESTS", matches="true")
@AutoConfigureMockMvc
@SpringBootTest(properties={
    "spring.datasource.url=${TEST_DATABASE_URL:jdbc:postgresql://127.0.0.1:55437/jobsdb_test}",
    "spring.datasource.username=${TEST_DATABASE_USER:jobsdb}",
    "spring.datasource.password=${TEST_DATABASE_PASSWORD:}",
    "jwt.secret=integration-test-key-only-not-for-production-at-least-64-characters",
    "uploads.directory=target/integration-uploads"
})
class HiringIntegrationTest {
    private static final String RESUMES="/api/job-seeker/resumes";
    @Test void resumeOpenApiDocumentsBinaryDownloadsAndCompactMetadata() throws Exception {
        var spec=request("GET","/api-docs",null,null).body();
        var download=spec.path("paths").path("/api/employer/applications/{applicationId}/resume").path("get");
        assertThat(download.path("responses").path("200").path("content").path("application/pdf").path("schema").path("format").asText()).isEqualTo("binary");
        assertThat(download.path("security").toString()).contains("bearer-jwt").doesNotContain("bearerAuth");
        assertThat(spec.path("paths").path(RESUMES).path("post").path("requestBody").path("content").has("multipart/form-data")).isTrue();
        assertThat(spec.path("components").path("schemas").path("Metadata").path("properties").propertyNames())
            .containsExactlyInAnyOrder("id","fileName","sizeBytes","createdAt");
    }
    private static byte[] pdf(String marker) { return ("%PDF-1.7\n%"+marker+"\n%%EOF\n").getBytes(java.nio.charset.StandardCharsets.UTF_8); }
    private org.springframework.mock.web.MockHttpServletResponse uploadResume(Session user,String name,String type,byte[] bytes) throws Exception {
        var builder=org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart(RESUMES)
            .file(new org.springframework.mock.web.MockMultipartFile("file",name,type,bytes));
        if(user!=null) builder.header("Authorization","Bearer "+user.access());
        return mvc.perform(builder).andReturn().getResponse();
    }
    private org.springframework.mock.web.MockHttpServletResponse downloadResume(Session user,String path) throws Exception {
        var builder=org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path);
        if(user!=null) builder.header("Authorization","Bearer "+user.access());
        return mvc.perform(builder).andReturn().getResponse();
    }
    @Test void privateResumeContractValidationAndOwnerIsolation() throws Exception {
        var candidate=register("job-seeker");var stranger=register("job-seeker");var employer=register("employer");
        assertThat(uploadResume(null,"cv.pdf","application/pdf",pdf("one")).getStatus()).isEqualTo(401);
        assertThat(uploadResume(employer,"cv.pdf","application/pdf",pdf("one")).getStatus()).isEqualTo(403);
        for(var file:List.of(new byte[0],new byte[5242881],"fake".getBytes())) {
            var response=uploadResume(candidate,"cv.pdf","application/pdf",file);
            assertThat(response.getStatus()).isEqualTo(400);assertThat(json.readTree(response.getContentAsString()).path("success").asBoolean()).isFalse();
        }
        assertThat(uploadResume(candidate,"cv.html","text/html",pdf("one")).getStatus()).isEqualTo(400);
        var missing=mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart(RESUMES).header("Authorization","Bearer "+candidate.access())).andReturn().getResponse();
        assertThat(missing.getStatus()).isEqualTo(400);assertThat(json.readTree(missing.getContentAsString()).path("success").asBoolean()).isFalse();
        var uploaded=uploadResume(candidate,"../cv.pdf","application/pdf",pdf("one"));assertThat(uploaded.getStatus()).isEqualTo(200);
        var item=json.readTree(uploaded.getContentAsString()).path("data");String id=item.path("id").asText();
        assertThat(item.propertyNames()).containsExactlyInAnyOrder("id","fileName","sizeBytes","createdAt","current","attached");
        assertThat(item.path("fileName").asText()).isEqualTo("cv.pdf");
        assertThat(request("GET",RESUMES,null,stranger.access()).data().isEmpty()).isTrue();
        assertThat(request("PUT",RESUMES+"/"+id+"/current",Map.of(),stranger.access()).status()).isEqualTo(404);
        assertThat(request("DELETE",RESUMES+"/"+id,null,stranger.access()).status()).isEqualTo(404);
        assertThat(downloadResume(stranger,RESUMES+"/"+id+"/file").getStatus()).isEqualTo(404);
        assertThat(downloadResume(null,RESUMES+"/"+id+"/file").getStatus()).isEqualTo(401);
        assertThat(downloadResume(employer,RESUMES+"/"+id+"/file").getStatus()).isEqualTo(403);
        var download=downloadResume(candidate,RESUMES+"/"+id+"/file");
        assertThat(download.getContentAsByteArray()).isEqualTo(pdf("one"));
        assertThat(download.getContentType()).isEqualTo("application/pdf");
        assertThat(download.getHeader("Cache-Control")).contains("no-store");
        assertThat(download.getHeader("Content-Disposition")).startsWith("attachment;");
        assertThat(download.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(request("DELETE",RESUMES+"/"+id,null,candidate.access()).status()).isEqualTo(200);
        assertThat(downloadResume(candidate,RESUMES+"/"+id+"/file").getStatus()).isEqualTo(404);
    }
    @Test void submissionsRetainExactPdfWhileNewVersionsAndLegacyLinksRemainIndependent() throws Exception {
        var candidate=register("job-seeker");var other=register("job-seeker");var employer=register("employer");var stranger=register("employer");
        request("PUT","/api/job-seeker/profile",profile("Resume snapshot"),candidate.access());
        String first=json.readTree(uploadResume(candidate,"first.pdf","application/pdf",pdf("first")).getContentAsString()).path("data").path("id").asText();
        String application=request("POST","/api/applications",Map.of("jobId",job(employer,true)),candidate.access()).data().path("id").asText();
        String second=json.readTree(uploadResume(candidate,"second.pdf","application/pdf",pdf("second")).getContentAsString()).path("data").path("id").asText();
        String candidatePath="/api/applications/"+application+"/resume",employerPath="/api/employer/applications/"+application+"/resume";
        assertThat(downloadResume(candidate,candidatePath).getContentAsByteArray()).isEqualTo(pdf("first"));
        assertThat(downloadResume(employer,employerPath).getContentAsByteArray()).isEqualTo(pdf("first"));
        assertThat(downloadResume(other,candidatePath).getStatus()).isEqualTo(404);
        assertThat(downloadResume(stranger,employerPath).getStatus()).isEqualTo(404);
        assertThat(downloadResume(employer,candidatePath).getStatus()).isEqualTo(403);
        assertThat(downloadResume(candidate,employerPath).getStatus()).isEqualTo(403);
        var detail=request("GET","/api/applications/"+application,null,candidate.access()).data();
        assertThat(detail.path("resume").propertyNames()).containsExactlyInAnyOrder("id","fileName","sizeBytes","createdAt");
        assertThat(detail.path("resume").path("id").asText()).isEqualTo(first);
        assertThat(detail.path("submission").path("profile").path("resumeUrl").asText()).isEqualTo("https://example.com/cv-v1.pdf");
        assertThat(request("DELETE",RESUMES+"/"+first,null,candidate.access()).status()).isEqualTo(409);
        request("PUT",RESUMES+"/"+first+"/current",Map.of(),candidate.access());
        assertThat(request("GET",RESUMES,null,candidate.access()).data().findValues("current").stream().filter(JsonNode::asBoolean).count()).isEqualTo(1);
        request("DELETE",RESUMES+"/current",null,candidate.access());
        String without=request("POST","/api/applications",Map.of("jobId",job(employer,true)),candidate.access()).data().path("id").asText();
        assertThat(request("GET","/api/applications/"+without,null,candidate.access()).data().path("resume").isNull()).isTrue();
        assertThat(downloadResume(candidate,"/api/applications/"+without+"/resume").getStatus()).isEqualTo(404);
        assertThat(request("DELETE",RESUMES+"/"+second,null,candidate.access()).status()).isEqualTo(200);
        assertThat(downloadResume(candidate,candidatePath).getContentAsByteArray()).isEqualTo(pdf("first"));
    }
    @Test void resumeAttachmentFailureRollsBackTheApplicationAndSnapshot() throws Exception {
        var candidate=register("job-seeker");var employer=register("employer");
        uploadResume(candidate,"cv.pdf","application/pdf",pdf("one"));String jobId=job(employer,true);
        failAfterWrite("insert into application_resumes");
        try { assertThat(request("POST","/api/applications",Map.of("jobId",jobId),candidate.access()).status()).isEqualTo(409); }
        finally { org.mockito.Mockito.reset(jdbc); }
        assertThat(jdbc.queryForObject("select count(*) from applications where job_id=?",Long.class,UUID.fromString(jobId))).isZero();
        assertThat(request("GET",RESUMES,null,candidate.access()).data().get(0).path("attached").asBoolean()).isFalse();
        assertThat(request("POST","/api/applications",Map.of("jobId",jobId),candidate.access()).status()).isEqualTo(200);
    }
    @Test void concurrentResumeUploadsRespectCapacityAndKeepOneSelection() throws Exception {
        var candidate=register("job-seeker");
        for(int n=0;n<9;n++) assertThat(uploadResume(candidate,"cv.pdf","application/pdf",pdf("v"+n)).getStatus()).isEqualTo(200);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var gate=new CountDownLatch(1);
            var a=pool.submit(()->{gate.await();return uploadResume(candidate,"a.pdf","application/pdf",pdf("a")).getStatus();});
            var b=pool.submit(()->{gate.await();return uploadResume(candidate,"b.pdf","application/pdf",pdf("b")).getStatus();});
            gate.countDown();assertThat(List.of(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        } finally {pool.shutdownNow();}
        var versions=request("GET",RESUMES,null,candidate.access()).data();assertThat(versions.size()).isEqualTo(10);
        assertThat(versions.findValues("current").stream().filter(JsonNode::asBoolean).count()).isEqualTo(1);
    }
    private static final String SEARCHES="/api/job-seeker/saved-searches";
    @Test void concurrentSavedSearchCreationRespectsLimitAndPublicationIsIdempotent() throws Exception {
        var candidate=register("job-seeker");var employer=register("employer");
        for(int n=0;n<19;n++) request("POST",SEARCHES,Map.of("name","Saved "+n,"query","Engineer "+n),candidate.access());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var gate=new CountDownLatch(1);
            var a=pool.submit(()->{gate.await();return request("POST",SEARCHES,Map.of("name","Last A","query","Engineer"),candidate.access()).status();});
            var b=pool.submit(()->{gate.await();return request("POST",SEARCHES,Map.of("name","Last B","query","Integration"),candidate.access()).status();});
            gate.countDown();assertThat(List.of(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
            String jobId=job(employer,false);
            var one=pool.submit(()->request("PATCH","/api/jobs/"+jobId+"/status",Map.of("status","ACTIVE"),employer.access()).status());
            var two=pool.submit(()->request("PATCH","/api/jobs/"+jobId+"/status",Map.of("status","ACTIVE"),employer.access()).status());
            assertThat(one.get(10,TimeUnit.SECONDS)).isEqualTo(200);assertThat(two.get(10,TimeUnit.SECONDS)).isEqualTo(200);
            assertThat(inbox(candidate).path("totalElements").asInt()).isEqualTo(1);
        } finally {pool.shutdownNow();}
    }
    @Test void savedSearchMatchingHandlesLiteralTextNullSalariesClosedJobsAndBannedRecipients() throws Exception {
        var candidate=register("job-seeker");var employer=register("employer");
        String marker=UUID.randomUUID().toString();
        String searchId=request("POST",SEARCHES,Map.of("name","Exact","query",marker,"location","กรุงเทพ","salaryMin",0,"currency","THB"),candidate.access()).data().path("id").asText();
        var jobBody=new HashMap<String,Object>(Map.of("title","Role "+marker,"description","Description","location","กรุงเทพ","salaryCurrency","THB"));
        String missing=request("POST","/api/jobs",jobBody,employer.access()).data().path("id").asText();
        request("PATCH","/api/jobs/"+missing+"/status",Map.of("status","ACTIVE"),employer.access());
        assertThat(inbox(candidate).path("totalElements").asInt()).isZero();
        assertThat(request("GET",SEARCHES+"/"+searchId+"/jobs",null,candidate.access()).data().path("content").isEmpty()).isTrue();
        jobBody.put("salaryMin",0);jobBody.put("salaryMax",100);
        String match=request("POST","/api/jobs",jobBody,employer.access()).data().path("id").asText();
        assertThat(request("GET",SEARCHES+"/"+searchId+"/jobs",null,candidate.access()).data().path("content").isEmpty()).isTrue();
        request("PATCH","/api/jobs/"+match+"/status",Map.of("status","ACTIVE"),employer.access());
        assertThat(request("GET",SEARCHES+"/"+searchId+"/jobs",null,candidate.access()).data().path("content").size()).isEqualTo(1);
        request("PATCH","/api/jobs/"+match+"/status",Map.of("status","CLOSED"),employer.access());
        assertThat(request("GET",SEARCHES+"/"+searchId+"/jobs",null,candidate.access()).data().path("content").isEmpty()).isTrue();
        UUID user=jdbc.queryForObject("select user_id from saved_searches where id=?",UUID.class,UUID.fromString(searchId));
        jdbc.update("update users set banned=true where id=?",user);
        String banned=request("POST","/api/jobs",jobBody,employer.access()).data().path("id").asText();
        request("PATCH","/api/jobs/"+banned+"/status",Map.of("status","ACTIVE"),employer.access());
        assertThat(jdbc.queryForObject("select count(*) from notifications where recipient_id=?",Long.class,user)).isEqualTo(1);
    }
    @Test void savedSearchValidationOwnershipLimitAndContract() throws Exception {
        var candidate=register("job-seeker"); var other=register("job-seeker"); var employer=register("employer");
        assertThat(request("GET",SEARCHES,null,null).status()).isEqualTo(401);
        assertThat(request("GET",SEARCHES,null,employer.access()).status()).isEqualTo(403);
        assertThat(request("POST",SEARCHES,Map.of("name","Blank"),candidate.access()).status()).isEqualTo(400);
        assertThat(request("POST",SEARCHES,Map.of("name","Salary","salaryMin",200,"salaryMax",100,"currency","THB"),candidate.access()).status()).isEqualTo(400);
        assertThat(request("POST",SEARCHES,Map.of("name","Salary","salaryMin",1),candidate.access()).status()).isEqualTo(400);
        var created=request("POST",SEARCHES,Map.of("name"," Java ","query"," Java "),candidate.access());
        assertThat(created.status()).isEqualTo(200);
        assertThat(created.data().propertyNames()).containsExactlyInAnyOrder("id","name","query","location","salaryMin","salaryMax","currency","enabled","createdAt");
        assertThat(created.data().path("name").asText()).isEqualTo("Java");
        String path=SEARCHES+"/"+created.data().path("id").asText();
        assertThat(request("POST",SEARCHES,Map.of("name","Duplicate","query","java"),candidate.access()).status()).isEqualTo(409);
        assertThat(request("GET",SEARCHES,null,other.access()).data().isEmpty()).isTrue();
        assertThat(request("PATCH",path,Map.of("enabled",false),other.access()).status()).isEqualTo(404);
        assertThat(request("DELETE",path,null,other.access()).status()).isEqualTo(404);
        assertThat(request("GET",path+"/jobs",null,other.access()).status()).isEqualTo(404);
        assertThat(request("PATCH",path,Map.of(),candidate.access()).status()).isEqualTo(400);
        assertThat(request("PATCH",path,Map.of("enabled",false),candidate.access()).data().path("enabled").asBoolean()).isFalse();
        assertThat(request("GET",path+"/jobs?page=2147483647",null,candidate.access()).data().path("content").isEmpty()).isTrue();
        assertThat(request("GET",path+"/jobs?page=bad",null,candidate.access()).status()).isEqualTo(400);
        for(int n=0;n<19;n++) assertThat(request("POST",SEARCHES,Map.of("name","Search "+n,"query","unique"+n),candidate.access()).status()).isEqualTo(200);
        assertThat(request("POST",SEARCHES,Map.of("name","Too many","query","over limit"),candidate.access()).status()).isEqualTo(409);
        assertThat(request("GET",SEARCHES,null,candidate.access()).data().size()).isEqualTo(20);
        assertThat(request("DELETE",path,null,candidate.access()).status()).isEqualTo(200);
        assertThat(request("DELETE",path,null,candidate.access()).status()).isEqualTo(404);
        assertThat(request("GET","/api-docs",null,null).body().path("paths").has(SEARCHES+"/{searchId}/jobs")).isTrue();
    }
    @Test void firstPublicationMatchesCriteriaOnceAndPauseDoesNotBackfill() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker"); var wrongCurrency=register("job-seeker"); var literal=register("job-seeker");
        String old=job(employer,true);
        var search=request("POST",SEARCHES,Map.of("name","Engineer","query","engineer","location","BANGKOK","salaryMin",200,"salaryMax",300,"currency","thb"),candidate.access()).data();
        String id=search.path("id").asText();
        request("POST",SEARCHES,Map.of("name","Overlap","query","Integration"),candidate.access());
        request("POST",SEARCHES,Map.of("name","USD","query","engineer","salaryMin",1,"currency","USD"),wrongCurrency.access());
        request("POST",SEARCHES,Map.of("name","Literal percent","query","%"),literal.access());
        assertThat(inbox(candidate).path("totalElements").asInt()).isZero();
        String jobId=job(employer,false);
        request("PATCH","/api/jobs/"+jobId+"/status",Map.of("status","ACTIVE"),employer.access());
        assertThat(inbox(candidate).path("totalElements").asInt()).isEqualTo(1);
        assertThat(inbox(candidate).path("content").get(0).path("kind").asText()).isEqualTo("JOB_MATCH");
        assertThat(inbox(candidate).path("content").get(0).path("href").asText()).isEqualTo("/jobs/"+jobId);
        assertThat(inbox(wrongCurrency).path("totalElements").asInt()).isZero();
        assertThat(inbox(literal).path("totalElements").asInt()).isZero();
        request("PATCH","/api/jobs/"+jobId+"/status",Map.of("status","CLOSED"),employer.access());
        request("PATCH","/api/jobs/"+jobId+"/status",Map.of("status","ACTIVE"),employer.access());
        request("PATCH","/api/jobs/"+old+"/status",Map.of("status","ACTIVE"),employer.access());
        assertThat(inbox(candidate).path("totalElements").asInt()).isEqualTo(1);
        assertThat(request("GET",SEARCHES+"/"+id+"/jobs",null,candidate.access()).data().path("content").size()).isGreaterThanOrEqualTo(2);
        for(var item:request("GET",SEARCHES,null,candidate.access()).data()) request("PATCH",SEARCHES+"/"+item.path("id").asText(),Map.of("enabled",false),candidate.access());
        String pausedJob=job(employer,true);
        request("PATCH",SEARCHES+"/"+id,Map.of("enabled",true),candidate.access());
        request("PATCH","/api/jobs/"+pausedJob+"/status",Map.of("status","ACTIVE"),employer.access());
        assertThat(inbox(candidate).path("totalElements").asInt()).isEqualTo(1);
        job(employer,true);
        assertThat(inbox(candidate).path("totalElements").asInt()).isEqualTo(2);
    }
    @Test void alertWriteFailureRollsBackPublicationAndJobStatus() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker");
        request("POST",SEARCHES,Map.of("name","Engineer","query","engineer"),candidate.access());
        String jobId=job(employer,false);
        failAfterWrite("insert into notifications");
        try { assertThat(request("PATCH","/api/jobs/"+jobId+"/status",Map.of("status","ACTIVE"),employer.access()).status()).isEqualTo(409); }
        finally { org.mockito.Mockito.reset(jdbc); }
        assertThat(jdbc.queryForObject("select status from jobs where id=?",String.class,UUID.fromString(jobId))).isEqualTo("DRAFT");
        assertThat(jdbc.queryForObject("select count(*) from job_publications where job_id=?",Long.class,UUID.fromString(jobId))).isZero();
        assertThat(inbox(candidate).path("totalElements").asInt()).isZero();
        assertThat(request("PATCH","/api/jobs/"+jobId+"/status",Map.of("status","ACTIVE"),employer.access()).status()).isEqualTo(200);
        assertThat(inbox(candidate).path("totalElements").asInt()).isEqualTo(1);
    }
    @Autowired com.darklordempeor.jobsdb.application.port.NotificationPort notificationPort;
    private JsonNode inbox(Session user) throws Exception { return request("GET","/api/notifications",null,user.access()).data(); }
    @Test void notificationsArePrivatePaginatedIdempotentAndCompact() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker"); var stranger=register("employer");
        assertThat(request("GET","/api/notifications",null,null).status()).isEqualTo(401);
        assertThat(request("GET","/api/notifications/unread-count",null,null).status()).isEqualTo(401);
        assertThat(inbox(candidate).path("content").isEmpty()).isTrue();
        String jobId=job(employer,true);
        String application=request("POST","/api/applications",Map.of("jobId",jobId),candidate.access()).data().path("id").asText();
        assertThat(request("POST","/api/applications",Map.of("jobId",jobId),candidate.access()).status()).isEqualTo(409);
        var item=inbox(employer).path("content").get(0); String id=item.path("id").asText();
        assertThat(item.propertyNames()).containsExactlyInAnyOrder("id","kind","title","message","href","createdAt","readAt");
        assertThat(item.path("kind").asText()).isEqualTo("NEW_APPLICATION");
        assertThat(item.path("href").asText()).isEqualTo("/employer/applicants/"+jobId+"?applicationId="+application);
        assertThat(inbox(stranger).path("totalElements").asInt()).isZero();
        assertThat(request("PATCH","/api/notifications/"+id+"/read",null,stranger.access()).status()).isEqualTo(404);
        assertThat(request("PATCH","/api/notifications/"+id+"/read",null,null).status()).isEqualTo(401);
        assertThat(request("PATCH","/api/notifications/"+UUID.randomUUID()+"/read",null,employer.access()).status()).isEqualTo(404);
        assertThat(request("PATCH","/api/notifications/not-a-uuid/read",null,employer.access()).status()).isEqualTo(400);
        assertThat(request("GET","/api/notifications?page=bad",null,employer.access()).status()).isEqualTo(400);
        assertThat(request("GET","/api/notifications?unreadOnly=bad",null,employer.access()).status()).isEqualTo(400);
        var recipient=jdbc.queryForObject("select recipient_id from notifications where id=?",UUID.class,UUID.fromString(id));
        var draft=new com.darklordempeor.jobsdb.application.model.NotificationModels.Draft(recipient,"application:"+application+":submitted",
            com.darklordempeor.jobsdb.domain.model.Notification.Kind.NEW_APPLICATION,"Duplicate","Duplicate","/jobs");
        notificationPort.publish(draft); notificationPort.publish(draft);
        assertThat(inbox(employer).path("totalElements").asInt()).isEqualTo(1);
        assertThat(request("GET","/api/notifications/unread-count",null,employer.access()).data().path("unreadCount").asInt()).isEqualTo(1);
        var read=request("PATCH","/api/notifications/"+id+"/read",null,employer.access());
        assertThat(read.status()).isEqualTo(200); assertThat(read.data().path("readAt").isNull()).isFalse();
        assertThat(request("PATCH","/api/notifications/"+id+"/read",null,employer.access()).data()).isEqualTo(read.data());
        assertThat(request("GET","/api/notifications?unreadOnly=true",null,employer.access()).data().path("content").isEmpty()).isTrue();
        assertThat(request("GET","/api/notifications/unread-count",null,employer.access()).data().path("unreadCount").asInt()).isZero();
        apply(employer,candidate); apply(employer,candidate);
        assertThat(request("GET","/api/notifications?page=0&size=2",null,employer.access()).data().path("content").size()).isEqualTo(2);
        var last=request("GET","/api/notifications?page=1&size=2",null,employer.access()).data();
        assertThat(last.path("content").size()).isEqualTo(1); assertThat(last.path("totalPages").asInt()).isEqualTo(2);
        assertThat(request("GET","/api/notifications?page=2147483647",null,employer.access()).data().path("content").isEmpty()).isTrue();
        assertThat(request("GET","/api/notifications?page=-1&size=0",null,employer.access()).data().path("page").asInt()).isZero();
        assertThat(request("GET","/api-docs",null,null).body().path("paths").path("/api/notifications/{id}/read").path("patch").path("security").get(0).has("bearer-jwt")).isTrue();
    }
    @Test void statusAndInterviewNotificationsFollowRecipientsAndVersions() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker"); var stranger=register("job-seeker");
        String application=apply(employer,candidate);
        String statusPath="/api/employer/applications/"+application+"/status";
        var transition=Map.of("expectedStatus","SUBMITTED","status","REVIEWING","reason","PRIVATE INTERNAL NOTE");
        assertThat(request("PATCH",statusPath,transition,employer.access()).status()).isEqualTo(200);
        assertThat(request("PATCH",statusPath,transition,employer.access()).status()).isEqualTo(409);
        assertThat(inbox(candidate).path("totalElements").asInt()).isEqualTo(1);
        assertThat(inbox(candidate).toString()).doesNotContain("PRIVATE INTERNAL NOTE");
        var start=java.time.Instant.now().plusSeconds(86400);
        var created=request("POST","/api/employer/applications/"+application+"/interviews",invitation(start),employer.access()).data();
        String id=created.path("id").asText();
        assertThat(request("GET","/api/job-seeker/interviews/"+id,null,stranger.access()).status()).isEqualTo(403);
        assertThat(request("GET","/api/job-seeker/interviews/"+id,null,candidate.access()).data()).isEqualTo(created);
        assertThat(request("GET","/api/employer/interviews/"+id,null,employer.access()).data()).isEqualTo(created);
        var rescheduled=request("PUT","/api/employer/interviews/"+id+"?expectedVersion=0",invitation(start.plusSeconds(86400)),employer.access()).data();
        String slot=rescheduled.path("slots").get(0).path("id").asText();
        assertThat(request("POST","/api/job-seeker/interviews/"+id+"/accept",Map.of("expectedVersion",1,"slotId",slot),candidate.access()).status()).isEqualTo(200);
        assertThat(request("POST","/api/job-seeker/interviews/"+id+"/accept",Map.of("expectedVersion",1,"slotId",slot),candidate.access()).status()).isEqualTo(409);
        assertThat(inbox(employer).path("totalElements").asInt()).isEqualTo(2);
        assertThat(inbox(candidate).path("totalElements").asInt()).isEqualTo(3);
        assertThat(request("POST","/api/job-seeker/interviews/"+id+"/cancel",Map.of("expectedVersion",2),candidate.access()).status()).isEqualTo(200);
        assertThat(inbox(employer).path("content").get(0).path("kind").asText()).isEqualTo("INTERVIEW_CANCELLED");
        var next=request("POST","/api/employer/applications/"+application+"/interviews",invitation(start),employer.access()).data();
        String nextId=next.path("id").asText();
        assertThat(request("POST","/api/job-seeker/interviews/"+nextId+"/decline",Map.of("expectedVersion",0),candidate.access()).status()).isEqualTo(200);
        assertThat(inbox(employer).path("content").get(0).path("kind").asText()).isEqualTo("INTERVIEW_DECLINED");
        var cancelled=request("POST","/api/employer/applications/"+application+"/interviews",invitation(start),employer.access()).data();
        assertThat(request("POST","/api/employer/interviews/"+cancelled.path("id").asText()+"/cancel",Map.of("expectedVersion",0),employer.access()).status()).isEqualTo(200);
        assertThat(inbox(candidate).path("content").get(0).path("kind").asText()).isEqualTo("INTERVIEW_CANCELLED");
        for (String outcome:List.of("COMPLETED","NO_SHOW")) {
            var round=request("POST","/api/employer/applications/"+application+"/interviews",invitation(start),employer.access()).data();
            String roundId=round.path("id").asText(), roundSlot=round.path("slots").get(0).path("id").asText();
            assertThat(request("POST","/api/job-seeker/interviews/"+roundId+"/accept",Map.of("expectedVersion",0,"slotId",roundSlot),candidate.access()).status()).isEqualTo(200);
            jdbc.update("update interview_slots set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id=?",UUID.fromString(roundSlot));
            assertThat(request("POST","/api/employer/interviews/"+roundId+"/outcome",Map.of("expectedVersion",1,"outcome",outcome),employer.access()).status()).isEqualTo(200);
            assertThat(inbox(candidate).path("content").get(0).path("kind").asText()).isEqualTo("INTERVIEW_"+outcome);
        }
    }
    @Test void notificationWriteFailuresRollBackSubmissionTransitionAndInterview() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker"); String jobId=job(employer,true);
        failAfterWrite("insert into notifications");
        assertThat(request("POST","/api/applications",Map.of("jobId",jobId),candidate.access()).status()).isGreaterThanOrEqualTo(400);
        assertThat(jdbc.queryForObject("select count(*) from applications where job_id=?",Integer.class,UUID.fromString(jobId))).isZero();
        assertThat(inbox(employer).path("totalElements").asInt()).isZero();
        org.mockito.Mockito.reset(jdbc);
        String application=request("POST","/api/applications",Map.of("jobId",jobId),candidate.access()).data().path("id").asText();
        failAfterWrite("insert into notifications");
        assertThat(request("PATCH","/api/employer/applications/"+application+"/status",Map.of("expectedStatus","SUBMITTED","status","REVIEWING","reason","Review"),employer.access()).status()).isGreaterThanOrEqualTo(400);
        assertThat(request("GET","/api/applications/"+application,null,candidate.access()).data().path("application").path("status").asText()).isEqualTo("SUBMITTED");
        assertThat(inbox(candidate).path("totalElements").asInt()).isZero();
        assertThat(request("POST","/api/employer/applications/"+application+"/interviews",invitation(java.time.Instant.now().plusSeconds(86400)),employer.access()).status()).isGreaterThanOrEqualTo(400);
        assertThat(jdbc.queryForObject("select count(*) from interviews where application_id=?",Integer.class,UUID.fromString(application))).isZero();
        assertThat(inbox(candidate).path("totalElements").asInt()).isZero();
    }
    private Map<String,Object> invitation(java.time.Instant start) {
        return Map.of("mode","ONLINE","location","https://example.com/interview","timezone","Asia/Bangkok",
            "slots",List.of(Map.of("startsAt",start.toString(),"endsAt",start.plusSeconds(3600).toString()),
                            Map.of("startsAt",start.plusSeconds(7200).toString(),"endsAt",start.plusSeconds(10800).toString())));
    }
    private String apply(Session employer, Session candidate) throws Exception {
        return request("POST","/api/applications",Map.of("jobId",job(employer,true)),candidate.access()).data().path("id").asText();
    }
    @Test void interviewOutcomesHistoryAndRoundsAreAtomicPrivateAndVersioned() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker"); var stranger=register("employer");
        String application=apply(employer,candidate), create="/api/employer/applications/"+application+"/interviews";
        var start=java.time.Instant.now().plusSeconds(86400).truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
        var created=request("POST",create,invitation(start),employer.access()).data();
        String id=created.path("id").asText(), slot=created.path("slots").get(0).path("id").asText();
        assertThat(created.path("round").asInt()).isEqualTo(1);
        String outcome="/api/employer/interviews/"+id+"/outcome", history="/api/job-seeker/interviews/"+id+"/history";
        assertThat(request("POST",outcome,Map.of("expectedVersion",0,"outcome","COMPLETED"),employer.access()).status()).isEqualTo(409);
        assertThat(request("POST","/api/job-seeker/interviews/"+id+"/accept",Map.of("expectedVersion",0,"slotId",slot),candidate.access()).status()).isEqualTo(200);
        assertThat(request("POST",outcome,Map.of("expectedVersion",1,"outcome","COMPLETED"),employer.access()).status()).isEqualTo(409);
        assertThat(request("POST",outcome,Map.of("expectedVersion",1,"outcome","COMPLETED"),candidate.access()).status()).isEqualTo(403);
        assertThat(request("POST",outcome,Map.of("expectedVersion",1,"outcome","COMPLETED"),stranger.access()).status()).isEqualTo(403);
        assertThat(request("POST",outcome,Map.of("expectedVersion",1,"outcome","CANCELLED"),employer.access()).status()).isEqualTo(400);
        assertThat(request("POST",outcome,Map.of("outcome","COMPLETED"),employer.access()).status()).isEqualTo(400);
        // Move only this isolated fixture into the past so no wall-clock sleep is needed.
        jdbc.update("update interview_slots set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id=?",UUID.fromString(slot));
        failAfterWrite("insert into interview_revisions");
        assertThat(request("POST",outcome,Map.of("expectedVersion",1,"outcome","COMPLETED"),employer.access()).status()).isEqualTo(409);
        org.mockito.Mockito.reset(jdbc);
        assertThat(jdbc.queryForObject("select status from interviews where id=?",String.class,UUID.fromString(id))).isEqualTo("CONFIRMED");
        assertThat(request("GET",history,null,candidate.access()).data().path("totalElements").asInt()).isEqualTo(2);
        var completed=request("POST",outcome,Map.of("expectedVersion",1,"outcome","COMPLETED"),employer.access());
        assertThat(completed.status()).isEqualTo(200); assertThat(completed.data().path("selectedSlotId").asText()).isEqualTo(slot);
        assertThat(request("POST",outcome,Map.of("expectedVersion",2,"outcome","NO_SHOW"),employer.access()).status()).isEqualTo(409);
        assertThat(request("PUT","/api/employer/interviews/"+id+"?expectedVersion=2",invitation(start),employer.access()).status()).isEqualTo(409);
        var page=request("GET",history+"?page=0&size=1",null,candidate.access()).data();
        assertThat(page.path("totalElements").asInt()).isEqualTo(3);
        assertThat(page.path("content").get(0).path("event").asText()).isEqualTo("COMPLETED");
        assertThat(page.toString()).doesNotContain("employerId","candidateId","actorId","internalNote");
        assertThat(request("GET","/api/employer/interviews/"+id+"/history",null,stranger.access()).status()).isEqualTo(403);
        assertThat(request("GET",history+"?page=9",null,candidate.access()).data().path("content").isEmpty()).isTrue();
        var next=request("POST",create,invitation(start.plusSeconds(86400)),employer.access()).data();
        assertThat(next.path("round").asInt()).isEqualTo(2);
        String nextId=next.path("id").asText();
        var changed=request("PUT","/api/employer/interviews/"+nextId+"?expectedVersion=0",invitation(start.plusSeconds(172800)),employer.access()).data();
        assertThat(changed.path("round").asInt()).isEqualTo(2);
        var revisions=request("GET","/api/employer/interviews/"+nextId+"/history",null,employer.access()).data().path("content");
        assertThat(revisions.get(0).path("event").asText()).isEqualTo("RESCHEDULED");
        assertThat(java.time.Instant.parse(revisions.get(1).path("snapshot").path("slots").get(0).path("startsAt").asText())).isEqualTo(start.plusSeconds(86400).truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        String nextSlot=changed.path("slots").get(0).path("id").asText();
        assertThat(request("POST","/api/job-seeker/interviews/"+nextId+"/accept",Map.of("expectedVersion",1,"slotId",nextSlot),candidate.access()).status()).isEqualTo(200);
        jdbc.update("update interview_slots set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id=?",UUID.fromString(nextSlot));
        assertThat(request("POST","/api/employer/interviews/"+nextId+"/outcome",Map.of("expectedVersion",2,"outcome","NO_SHOW"),employer.access()).data().path("status").asText()).isEqualTo("NO_SHOW");
        assertThat(request("GET","/api/applications/"+application,null,candidate.access()).data().path("application").path("status").asText()).isEqualTo("SUBMITTED");
        jdbc.update("delete from applications where id=?",UUID.fromString(application));
        assertThat(jdbc.queryForObject("select count(*) from interview_revisions where interview_id in (?,?)",Integer.class,UUID.fromString(id),UUID.fromString(nextId))).isZero();
    }
    @Test void interviewsRoundTripPermissionsVersionsReschedulingCalendarAndHistory() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker"); var stranger=register("job-seeker"); var otherEmployer=register("employer");
        String application=apply(employer,candidate);
        var start=java.time.Instant.now().plusSeconds(172800).truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
        String create="/api/employer/applications/"+application+"/interviews";
        assertThat(request("POST",create,invitation(start),otherEmployer.access()).status()).isEqualTo(403);
        assertThat(request("POST",create,invitation(start),candidate.access()).status()).isEqualTo(403);
        var created=request("POST",create,invitation(start),employer.access()); assertThat(created.status()).isEqualTo(200);
        String id=created.data().path("id").asText(), slot=created.data().path("slots").get(0).path("id").asText();
        assertThat(created.data().properties().stream().map(Map.Entry::getKey).toList()).containsExactlyInAnyOrder("id","applicationId","jobTitle","companyName","candidateName","status","mode","location","timezone","slots","selectedSlotId","version","updatedAt","round");
        assertThat(request("POST",create,invitation(start),employer.access()).status()).isEqualTo(409);
        assertThat(request("GET","/api/job-seeker/interviews",null,stranger.access()).data().path("content").isEmpty()).isTrue();
        assertThat(request("GET","/api/job-seeker/interviews",null,null).status()).isEqualTo(401);
        assertThat(request("GET","/api/employer/interviews",null,candidate.access()).status()).isEqualTo(403);
        assertThat(request("GET","/api/job-seeker/interviews/"+id+"/calendar",null,candidate.access()).status()).isEqualTo(409);
        String accept="/api/job-seeker/interviews/"+id+"/accept";
        assertThat(request("POST",accept,Map.of("expectedVersion",0,"slotId",slot),stranger.access()).status()).isEqualTo(403);
        assertThat(request("POST",accept,Map.of("expectedVersion",0,"slotId",UUID.randomUUID()),candidate.access()).status()).isEqualTo(400);
        assertThat(request("POST",accept,Map.of("expectedVersion",0,"slotId",slot),candidate.access()).data().path("status").asText()).isEqualTo("CONFIRMED");
        assertThat(request("POST",accept,Map.of("expectedVersion",0,"slotId",slot),candidate.access()).status()).isEqualTo(409);
        assertThat(request("GET","/api/job-seeker/interviews/"+id+"/calendar",null,candidate.access()).data().path("content").asText()).contains("BEGIN:VCALENDAR\r\n","DTSTART:","SEQUENCE:1");
        assertThat(request("GET","/api/job-seeker/interviews/"+id+"/calendar",null,stranger.access()).status()).isEqualTo(403);
        assertThat(request("GET","/api/employer/interviews/"+id+"/calendar",null,employer.access()).status()).isEqualTo(200);
        var changed=request("PUT","/api/employer/interviews/"+id+"?expectedVersion=1",invitation(start.plusSeconds(86400)),employer.access());
        assertThat(changed.status()).isEqualTo(200); assertThat(changed.data().path("status").asText()).isEqualTo("PROPOSED");
        assertThat(changed.data().path("selectedSlotId").isNull()).isTrue(); assertThat(changed.data().path("version").asInt()).isEqualTo(2);
        assertThat(request("POST",accept,Map.of("expectedVersion",2,"slotId",slot),candidate.access()).status()).isEqualTo(400);
        assertThat(request("POST","/api/job-seeker/interviews/"+id+"/decline",Map.of("expectedVersion",2),candidate.access()).status()).isEqualTo(200);
        assertThat(request("GET","/api/job-seeker/interviews",null,candidate.access()).data().path("totalElements").asInt()).isZero();
        assertThat(request("GET","/api/job-seeker/interviews?upcoming=false",null,candidate.access()).data().path("totalElements").asInt()).isEqualTo(1);
        assertThat(request("GET","/api/job-seeker/interviews?upcoming=false&page=2147483647",null,candidate.access()).data().path("content").isEmpty()).isTrue();
        var next=request("POST",create,invitation(start),employer.access()); String nextId=next.data().path("id").asText();
        assertThat(request("POST","/api/employer/interviews/"+nextId+"/cancel",Map.of("expectedVersion",0),employer.access()).status()).isEqualTo(200);
        assertThat(request("POST","/api/employer/interviews/"+nextId+"/cancel",Map.of("expectedVersion",1),employer.access()).status()).isEqualTo(409);
        assertThat(request("GET","/api/applications/"+application,null,candidate.access()).data().path("application").path("status").asText()).isEqualTo("SUBMITTED");
        var schema=request("GET","/api-docs",null,null).body();
        assertThat(schema.path("paths").has("/api/job-seeker/interviews/{interviewId}/accept")).isTrue();
        assertThat(schema.path("paths").path("/api/job-seeker/interviews/{interviewId}/accept").path("post").path("security").get(0).has("bearer-jwt")).isTrue();
    }
    @Test void simultaneousInterviewAcceptancesCannotDoubleBookEmployerOrCandidate() throws Exception {
        for (boolean sharedEmployer : List.of(true,false)) {
            var employer=register("employer"); var candidate=register("job-seeker");
            var secondEmployer=sharedEmployer?employer:register("employer"); var secondCandidate=sharedEmployer?register("job-seeker"):candidate;
            var start=java.time.Instant.now().plusSeconds(259200).truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
            var first=request("POST","/api/employer/applications/"+apply(employer,candidate)+"/interviews",invitation(start),employer.access()).data();
            var second=request("POST","/api/employer/applications/"+apply(secondEmployer,secondCandidate)+"/interviews",invitation(start),secondEmployer.access()).data();
            var pool=Executors.newFixedThreadPool(2); var gate=new CountDownLatch(1);
            try {
                var a=pool.submit(() -> { gate.await(); return request("POST","/api/job-seeker/interviews/"+first.path("id").asText()+"/accept",Map.of("expectedVersion",0,"slotId",first.path("slots").get(0).path("id").asText()),candidate.access()).status(); });
                var b=pool.submit(() -> { gate.await(); return request("POST","/api/job-seeker/interviews/"+second.path("id").asText()+"/accept",Map.of("expectedVersion",0,"slotId",second.path("slots").get(0).path("id").asText()),secondCandidate.access()).status(); });
                gate.countDown(); assertThat(List.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
            } finally { pool.shutdownNow(); }
        }
    }
    @Test void invalidInterviewRequestsRollbackAndCancelledBookingsReleaseTime() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker"); String application=apply(employer,candidate);
        var start=java.time.Instant.now().plusSeconds(345600).truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
        String create="/api/employer/applications/"+application+"/interviews";
        for (var bad : List.of(Map.of("location","http://insecure.example.com"),Map.of("timezone","Invalid/Zone"),Map.of("slots",List.of()),Map.of("mode","BAD"))) {
            var body=new HashMap<String,Object>(invitation(start)); body.putAll(bad);
            assertThat(request("POST",create,body,employer.access()).status()).isEqualTo(400);
        }
        assertThat(request("POST",create,invitation(java.time.Instant.now().minusSeconds(86400)),employer.access()).status()).isEqualTo(400);
        failAfterWrite("insert into interview_slots");
        assertThat(request("POST",create,invitation(start),employer.access()).status()).isEqualTo(409);
        org.mockito.Mockito.reset(jdbc);
        assertThat(jdbc.queryForObject("select count(*) from interviews where application_id=?",Integer.class,UUID.fromString(application))).isZero();
        var created=request("POST",create,invitation(start),employer.access()).data(); String id=created.path("id").asText();
        assertThat(request("POST","/api/job-seeker/interviews/"+id+"/accept",Map.of("expectedVersion",0,"slotId",created.path("slots").get(0).path("id").asText()),candidate.access()).status()).isEqualTo(200);
        // A failed reschedule must retain the confirmed slot and original version.
        failAfterWrite("insert into interview_slots");
        assertThat(request("PUT","/api/employer/interviews/"+id+"?expectedVersion=1",invitation(start.plusSeconds(86400)),employer.access()).status()).isEqualTo(409);
        org.mockito.Mockito.reset(jdbc);
        assertThat(jdbc.queryForObject("select status from interviews where id=?",String.class,UUID.fromString(id))).isEqualTo("CONFIRMED");
        assertThat(request("POST","/api/job-seeker/interviews/"+id+"/cancel",Map.of("expectedVersion",1),candidate.access()).status()).isEqualTo(200);
        var fresh=request("POST",create,invitation(start),employer.access()).data();
        assertThat(request("POST","/api/job-seeker/interviews/"+fresh.path("id").asText()+"/accept",Map.of("expectedVersion",0,"slotId",fresh.path("slots").get(0).path("id").asText()),candidate.access()).status()).isEqualTo(200);
        jdbc.update("delete from applications where id=?",UUID.fromString(application));
        assertThat(jdbc.queryForObject("select count(*) from interviews where application_id=?",Integer.class,UUID.fromString(application))).isZero();
        assertThat(jdbc.queryForObject("select count(*) from interview_slots where interview_id=?",Integer.class,UUID.fromString(fresh.path("id").asText()))).isZero();
    }
    @Test void savedPagesArePrivateCompactStableAndKeepUnavailableJobsRemovable() throws Exception {
        var employer = register("employer"); var candidate = register("job-seeker"); var other = register("job-seeker");
        String first = job(employer, true), second = job(employer, true), third = job(employer, true);
        for (String id : List.of(first, second, third)) request("PUT", "/api/job-seeker/saved-jobs/" + id, null, candidate.access());
        jdbc.update("update saved_jobs set saved_at='2026-01-01T00:00:00Z' where job_id in (?, ?, ?)", UUID.fromString(first), UUID.fromString(second), UUID.fromString(third));
        var page = request("GET", "/api/job-seeker/saved-jobs/page?size=2", null, candidate.access());
        assertThat(page.status()).isEqualTo(200);
        assertThat(page.data().path("totalElements").asInt()).isEqualTo(3);
        assertThat(page.data().path("totalPages").asInt()).isEqualTo(2);
        var expected = new ArrayList<>(List.of(first, second, third)); Collections.sort(expected);
        assertThat(page.data().path("content").get(0).path("jobId").asText()).isEqualTo(expected.get(0));
        assertThat(page.data().path("content").get(1).path("jobId").asText()).isEqualTo(expected.get(1));
        assertThat(page.data().path("content").get(0).properties().stream().map(Map.Entry::getKey).toList())
            .containsExactlyInAnyOrder("jobId", "title", "companyName", "location", "status", "savedAt");
        assertThat(request("GET", "/api/job-seeker/saved-jobs/page?size=2&page=1", null, candidate.access()).data().path("content").get(0).path("jobId").asText()).isEqualTo(expected.get(2));
        assertThat(request("GET", "/api/job-seeker/saved-jobs/page", null, other.access()).data().path("totalElements").asInt()).isZero();
        assertThat(request("GET", "/api/job-seeker/saved-jobs/page", null, employer.access()).status()).isEqualTo(403);
        assertThat(request("GET", "/api/job-seeker/saved-jobs/page", null, null).status()).isEqualTo(401);
        assertThat(request("GET", "/api/job-seeker/saved-jobs/page?page=invalid", null, candidate.access()).status()).isEqualTo(400);
        assertThat(request("GET", "/api/job-seeker/saved-jobs/page?page=2147483647", null, candidate.access()).data().path("content").isEmpty()).isTrue();
        assertThat(request("GET", "/api/job-seeker/saved-jobs", null, candidate.access()).data().size()).isEqualTo(3);
        request("PATCH", "/api/jobs/" + first + "/status", Map.of("status", "CLOSED"), employer.access());
        request("PATCH", "/api/jobs/" + second + "/status", Map.of("status", "DRAFT"), employer.access());
        var all = request("GET", "/api/job-seeker/saved-jobs/page?size=50", null, candidate.access()).data().path("content");
        for (var row : all) {
            if (row.path("jobId").asText().equals(first)) assertThat(row.path("status").asText()).isEqualTo("CLOSED");
            if (row.path("jobId").asText().equals(second)) {
                assertThat(row.path("title").asText()).isEqualTo("Job unavailable");
                assertThat(row.path("companyName").asText()).isEmpty();
                assertThat(row.path("location").isNull()).isTrue();
            }
        }
        for (String id : List.of(first, second, third)) assertThat(request("DELETE", "/api/job-seeker/saved-jobs/" + id, null, candidate.access()).status()).isEqualTo(200);
        assertThat(request("GET", "/api/job-seeker/saved-jobs/page", null, candidate.access()).data().path("content").isEmpty()).isTrue();
    }

    @Test void workExperienceRoundTripsValidatesAndDoesNotChangeSubmittedSnapshot() throws Exception {
        var candidate = register("job-seeker"); var employer = register("employer");
        var payload = new HashMap<String,Object>(profile("Career history"));
        var experience = new HashMap<String,Object>(Map.of("company", "Example Co", "title", "Engineer", "startDate", "2022-01-01", "endDate", "2024-12-31", "description", "Built reliable services"));
        payload.put("workExperiences", List.of(experience));
        assertThat(request("PUT", "/api/job-seeker/profile", payload, candidate.access()).status()).isEqualTo(200);
        var stored = request("GET", "/api/job-seeker/profile", null, candidate.access()).data().path("workExperiences").get(0);
        assertThat(stored.path("company").asText()).isEqualTo("Example Co");
        assertThat(stored.path("startDate").asText()).isEqualTo("2022-01-01");
        String application = request("POST", "/api/applications", Map.of("jobId", job(employer, true)), candidate.access()).data().path("id").asText();
        for (var bad : List.of(Map.of("company", " "), Map.of("title", "x".repeat(181)), Map.of("endDate", "2021-01-01"), Map.of("startDate", "2024-02-30"))) {
            var invalid = new HashMap<>(experience); invalid.putAll(bad); payload.put("workExperiences", List.of(invalid));
            var reply = request("PUT", "/api/job-seeker/profile", payload, candidate.access());
            assertThat(reply.status()).isEqualTo(400); assertThat(reply.body().path("success").asBoolean()).isFalse();
        }
        experience.remove("endDate"); payload.put("workExperiences", List.of(experience));
        assertThat(request("PUT", "/api/job-seeker/profile", payload, candidate.access()).status()).isEqualTo(200);
        payload.put("workExperiences", List.of());
        assertThat(request("PUT", "/api/job-seeker/profile", payload, candidate.access()).status()).isEqualTo(200);
        assertThat(request("GET", "/api/job-seeker/profile", null, candidate.access()).data().path("workExperiences").isEmpty()).isTrue();
        assertThat(request("GET", "/api/applications/" + application, null, candidate.access()).data().path("submission").path("profile").path("workExperiences").get(0).path("endDate").asText()).isEqualTo("2024-12-31");
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean JdbcTemplate jdbc;
    @DynamicPropertySource
    static void isolatedDatabase(DynamicPropertyRegistry registry) {
        String url = System.getenv().getOrDefault("TEST_DATABASE_URL", "jdbc:postgresql://127.0.0.1:55437/jobsdb_test");
        if (!url.matches("jdbc:postgresql://[^/]+/jobsdb_test(?:\\?.*)?")) {
            throw new IllegalArgumentException("Integration tests require an isolated jobsdb_test database");
        }
        registry.add("spring.datasource.url", () -> url);
    }
    @Test void scorecardsArePrivateVersionedImmutableAndTransactional() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker"); var stranger=register("employer");
        String application=apply(employer,candidate);
        var interview=request("POST","/api/employer/applications/"+application+"/interviews",invitation(java.time.Instant.now().plusSeconds(86400)),employer.access()).data();
        String id=interview.path("id").asText(), slot=interview.path("slots").get(0).path("id").asText();
        String path="/api/employer/interviews/"+id+"/scorecard";
        assertThat(request("GET",path,null,employer.access()).data().isNull()).isTrue();
        assertThat(request("GET",path+"/history",null,employer.access()).data().path("totalElements").asInt()).isZero();
        for(var token:List.of(candidate.access(),stranger.access())) {
            assertThat(request("GET",path,null,token).status()).isEqualTo(403);
            assertThat(request("GET",path+"/history",null,token).status()).isEqualTo(403);
            assertThat(request("PUT",path,Map.of("expectedVersion",0,"feedback",Map.of()),token).status()).isEqualTo(403);
            assertThat(request("POST",path+"/finalize",Map.of("expectedVersion",0,"feedback",Map.of()),token).status()).isEqualTo(403);
        }
        assertThat(request("PUT",path,Map.of("feedback",Map.of()),employer.access()).status()).isEqualTo(400);
        for(var bad:List.of(Map.of("technicalSkills",0),Map.of("communication",6),Map.of("strengths","x".repeat(2001)),Map.of("recommendation","MAYBE")))
            assertThat(request("PUT",path,Map.of("expectedVersion",0,"feedback",bad),employer.access()).status()).isEqualTo(400);
        var feedback=Map.of("technicalSkills",4,"communication",3,"problemSolving",5,"strengths"," Private evidence ","concerns","","recommendation","HIRE");
        var body=Map.of("expectedVersion",0,"feedback",feedback);
        assertThat(request("POST",path+"/finalize",body,employer.access()).status()).isEqualTo(409);
        var saved=request("PUT",path,body,employer.access()); assertThat(saved.status()).isEqualTo(200);
        assertThat(saved.data().path("feedback").path("strengths").asText()).isEqualTo("Private evidence");
        assertThat(saved.data().toString()).doesNotContain("employerId","candidateId","actorId");
        assertThat(request("PUT",path,body,employer.access()).status()).isEqualTo(409);
        var raceBody=Map.of("expectedVersion",1,"feedback",feedback);
        var start=new java.util.concurrent.CountDownLatch(1);
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{start.await();return request("PUT",path,raceBody,employer.access()).status();});
            var b=pool.submit(()->{start.await();return request("PUT",path,raceBody,employer.access()).status();});
            start.countDown(); assertThat(List.of(a.get(),b.get())).containsExactlyInAnyOrder(200,409);
        }
        assertThat(request("POST","/api/job-seeker/interviews/"+id+"/accept",Map.of("expectedVersion",0,"slotId",slot),candidate.access()).status()).isEqualTo(200);
        jdbc.update("update interview_slots set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id=?",UUID.fromString(slot));
        assertThat(request("POST","/api/employer/interviews/"+id+"/outcome",Map.of("expectedVersion",1,"outcome","COMPLETED"),employer.access()).status()).isEqualTo(200);
        int notifications=inbox(candidate).path("totalElements").asInt();
        var finalBody=Map.of("expectedVersion",2,"feedback",feedback);
        assertThat(request("POST",path+"/finalize",Map.of("expectedVersion",2,"feedback",Map.of()),employer.access()).status()).isEqualTo(400);
        failAfterWrite("insert into interview_scorecard_revisions");
        try { assertThat(request("POST",path+"/finalize",finalBody,employer.access()).status()).isEqualTo(409); }
        finally { org.mockito.Mockito.reset(jdbc); }
        assertThat(request("GET",path,null,employer.access()).data().path("version").asInt()).isEqualTo(2);
        assertThat(request("GET",path,null,employer.access()).data().path("status").asText()).isEqualTo("DRAFT");
        var finalized=request("POST",path+"/finalize",finalBody,employer.access()); assertThat(finalized.status()).isEqualTo(200);
        assertThat(finalized.data().path("status").asText()).isEqualTo("FINALIZED"); assertThat(finalized.data().path("finalizedAt").isTextual()).isTrue();
        assertThat(request("GET",path,null,employer.access()).data()).isEqualTo(finalized.data());
        assertThat(request("GET",path+"/history",null,employer.access()).data().path("content").get(0)).isEqualTo(finalized.data());
        assertThat(request("PUT",path,Map.of("expectedVersion",3,"feedback",feedback),employer.access()).status()).isEqualTo(409);
        assertThat(request("POST",path+"/finalize",Map.of("expectedVersion",3,"feedback",feedback),employer.access()).status()).isEqualTo(409);
        var history=request("GET",path+"/history?page=1&size=1",null,employer.access()).data();
        assertThat(history.path("totalElements").asInt()).isEqualTo(3); assertThat(history.path("content").get(0).path("version").asInt()).isEqualTo(2);
        assertThat(request("GET",path+"/history?page=99",null,employer.access()).data().path("content").isEmpty()).isTrue();
        assertThat(request("GET","/api/job-seeker/interviews/"+id,null,candidate.access()).data().toString()).doesNotContain("Private evidence","feedback","recommendation");
        assertThat(request("GET","/api/job-seeker/interviews/"+id+"/history",null,candidate.access()).data().toString()).doesNotContain("Private evidence","feedback","recommendation");
        assertThat(inbox(candidate).path("totalElements").asInt()).isEqualTo(notifications);
        assertThat(jdbc.queryForObject("select status from applications where id=?",String.class,UUID.fromString(application))).isEqualTo("SUBMITTED");
        var docs=request("GET","/api-docs",null,null).body();
        assertThat(docs.path("paths").has("/api/employer/interviews/{interviewId}/scorecard")).isTrue();
    }
    @Test void closedInterviewDraftsStayReadableAndNewRoundsStartEmpty() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker"); String application=apply(employer,candidate);
        String create="/api/employer/applications/"+application+"/interviews";
        var invite=invitation(java.time.Instant.now().plusSeconds(86400));
        String id=request("POST",create,invite,employer.access()).data().path("id").asText();
        String path="/api/employer/interviews/"+id+"/scorecard";
        assertThat(request("PUT",path,Map.of("expectedVersion",0,"feedback",Map.of("concerns","Follow up")),employer.access()).status()).isEqualTo(200);
        assertThat(request("POST","/api/employer/interviews/"+id+"/cancel",Map.of("expectedVersion",0),employer.access()).status()).isEqualTo(200);
        assertThat(request("PUT",path,Map.of("expectedVersion",1,"feedback",Map.of()),employer.access()).status()).isEqualTo(409);
        assertThat(request("GET",path,null,employer.access()).data().path("feedback").path("concerns").asText()).isEqualTo("Follow up");
        String next=request("POST",create,invite,employer.access()).data().path("id").asText();
        assertThat(request("GET","/api/employer/interviews/"+next+"/scorecard",null,employer.access()).data().isNull()).isTrue();
    }
    @Test void hiringAnalyticsCountsDistinctCohortsAndDisclosesMissingHistory() throws Exception {
        var employer=register("employer"); var candidate=register("job-seeker"); var stranger=register("employer");
        var rows=new ArrayList<String>();
        for(int i=0;i<6;i++) rows.add(apply(employer,candidate));
        var dates=List.of("2024-01-01T00:00:00Z","2024-01-31T23:59:59.999999Z","2024-01-15T00:00:00Z","2024-01-16T00:00:00Z","2024-01-20T00:00:00Z","2024-01-21T00:00:00Z");
        var statuses=List.of("HIRED","HIRED","REJECTED","HIRED","SUBMITTED","REVIEWING");
        for(int i=0;i<rows.size();i++) {
            var id=UUID.fromString(rows.get(i)); var time=java.time.Instant.parse(dates.get(i));
            jdbc.update("update applications set applied_at=?,status=? where id=?",java.sql.Timestamp.from(time),statuses.get(i),id);
            jdbc.update("delete from application_events where application_id=?",id);
            if(i!=3 && i!=5) jdbc.update("insert into application_events(application_id,to_status,created_at) values(?,'SUBMITTED',?)",id,java.sql.Timestamp.from(time.minusMillis(10)));
            if(i<3) {
                jdbc.update("insert into application_events(application_id,from_status,to_status,created_at) values(?,'SUBMITTED','REVIEWING',?)",id,java.sql.Timestamp.from(time.plusSeconds(3600)));
                jdbc.update("insert into application_events(application_id,from_status,to_status,created_at) values(?,'REVIEWING',?,?)",id,statuses.get(i),java.sql.Timestamp.from(time.plusSeconds(i==0?172800:345600)));
            }
        }
        // Duplicate hire, future hire and invalid pre-submission hire must not inflate counts or durations.
        jdbc.update("insert into application_events(application_id,from_status,to_status,created_at) values(?,'REVIEWING','HIRED','2024-01-10T00:00:00Z')",UUID.fromString(rows.get(0)));
        jdbc.update("insert into application_events(application_id,to_status,created_at) values(?,'HIRED',?)",UUID.fromString(rows.get(4)),java.sql.Timestamp.from(java.time.Instant.now().plusSeconds(86400)));
        jdbc.update("insert into application_events(application_id,to_status,created_at) values(?,'HIRED','2024-01-01T00:00:00Z')",UUID.fromString(rows.get(3)));
        for(String date:List.of("2023-12-31T23:59:59.999999Z","2024-02-01T00:00:00Z")) {
            var id=apply(employer,candidate); jdbc.update("update applications set applied_at=? where id=?",java.sql.Timestamp.from(java.time.Instant.parse(date)),UUID.fromString(id));
        }
        var other=apply(stranger,candidate); jdbc.update("update applications set applied_at='2024-01-10T00:00:00Z' where id=?",UUID.fromString(other));
        String path="/api/employer/analytics?from=2024-01-01&to=2024-01-31";
        long events=jdbc.queryForObject("select count(*) from application_events",Long.class);
        var response=request("GET",path,null,employer.access()); assertThat(response.status()).isEqualTo(200); var report=response.data();
        assertThat(report.path("applications").asInt()).isEqualTo(6);
        assertThat(report.path("applicationsWithoutSubmissionHistory").asInt()).isEqualTo(2);
        assertThat(report.path("funnel").get(1).path("applications").asInt()).isEqualTo(3);
        assertThat(report.path("funnel").get(2).path("applications").asInt()).isEqualTo(2);
        assertThat(report.path("funnel").get(2).path("conversionPercent").asDouble()).isEqualTo(33.33);
        assertThat(report.path("timeToHire").path("sampleSize").asInt()).isEqualTo(2);
        assertThat(report.path("timeToHire").path("averageDays").asDouble()).isEqualTo(3);
        assertThat(report.path("timeToHire").path("medianDays").asDouble()).isEqualTo(3);
        assertThat(report.path("timeToHire").path("hiredWithoutTimestamp").asInt()).isEqualTo(1);
        assertThat(report.path("currentStatuses").get(2).path("applications").asInt()).isEqualTo(3);
        assertThat(report.toString()).doesNotContain("candidateId","email","actor","internalNote","feedback","strengths");
        assertThat(jdbc.queryForObject("select count(*) from application_events",Long.class)).isEqualTo(events);
        UUID selected=jdbc.queryForObject("select job_id from applications where id=?",UUID.class,UUID.fromString(rows.get(0)));
        assertThat(request("GET",path+"&jobId="+selected,null,employer.access()).data().path("applications").asInt()).isEqualTo(1);
        assertThat(request("GET",path+"&jobId="+selected,null,stranger.access()).status()).isEqualTo(403);
        assertThat(request("GET",path+"&jobId="+UUID.randomUUID(),null,employer.access()).status()).isEqualTo(404);
        assertThat(request("GET",path,null,candidate.access()).status()).isEqualTo(403);
        assertThat(request("GET",path,null,null).status()).isEqualTo(401);
        for(String query:List.of("from=bad","jobId=bad","from=2024-01-31&to=2024-01-01","from=2022-01-01&to=2024-01-01","to=2999-01-01")) {
            var invalid=request("GET","/api/employer/analytics?"+query,null,employer.access()); assertThat(invalid.status()).isEqualTo(400); assertThat(invalid.body().path("success").asBoolean()).isFalse();
        }
        var empty=request("GET","/api/employer/analytics?from=2020-01-01&to=2020-01-01",null,employer.access()).data();
        assertThat(empty.path("applications").asInt()).isZero(); assertThat(empty.path("funnel").get(0).path("conversionPercent").isNull()).isTrue(); assertThat(empty.path("timeToHire").path("medianDays").isNull()).isTrue();
        assertThat(request("GET","/api/employer/analytics",null,employer.access()).status()).isEqualTo(200);
        var operation=request("GET","/api-docs",null,null).body().path("paths").path("/api/employer/analytics").path("get");
        assertThat(operation.path("security").toString()).contains("bearer-jwt"); assertThat(operation.path("parameters").toString()).contains("from","to","jobId");
    }
    record Session(String access, String refresh) {}
    record Reply(int status, JsonNode body) { JsonNode data() { return body.path("data"); } }

    private Reply request(String method, String path, Object body, String token) throws Exception {
        // Only run this suite against the explicitly isolated test database.
        assertThat(jdbc.queryForObject("select current_database()", String.class)).isEqualTo("jobsdb_test");
        var builder = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(HttpMethod.valueOf(method), path).contentType("application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (body != null) builder.content(json.writeValueAsString(body));
        var response = mvc.perform(builder).andReturn().getResponse();
        return new Reply(response.getStatus(), json.readTree(response.getContentAsString()));
    }
    private Session register(String role) throws Exception {
        var reply = request("POST", "/api/auth/register/" + role, Map.of("email", UUID.randomUUID() + "@example.com", "password", "TestPassword123!", "displayName", "Test person"), null);
        assertThat(reply.status()).isEqualTo(200);
        assertThat(reply.data().has("passwordHash")).isFalse();
        return new Session(reply.data().path("accessToken").asText(), reply.data().path("refreshToken").asText());
    }
    private String job(Session employer, boolean active) throws Exception {
        var reply = request("POST", "/api/jobs", Map.of("title","Integration Engineer","description","Build reliable products","location","Bangkok","salaryMin",100,"salaryMax",200,"salaryCurrency","THB"), employer.access());
        assertThat(reply.status()).isEqualTo(200);
        String id = reply.data().path("id").asText();
        if (active) assertThat(request("PATCH","/api/jobs/" + id + "/status",Map.of("status","ACTIVE"),employer.access()).status()).isEqualTo(200);
        return id;
    }
    private Map<String,Object> profile(String summary) {
        return Map.of("fullName","Candidate Example","summary",summary,"resumeUrl","https://example.com/cv-v1.pdf",
            "skills",List.of(Map.of("name","Angular")), "workExperiences",List.of(), "educations",List.of(), "languages",List.of(), "licenses",List.of());
    }

    // Fail after an actual SQL write, then inspect the committed state outside the transaction.
    private void failAfterWrite(String prefix) {
        org.mockito.Mockito.doAnswer(invocation -> {
            invocation.callRealMethod();
            throw new org.springframework.dao.DataIntegrityViolationException("Injected write failure");
        }).when(jdbc).update(org.mockito.ArgumentMatchers.argThat((String sql) -> sql.stripLeading().startsWith(prefix)),
                org.mockito.ArgumentMatchers.any(Object[].class));
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"insert into application_snapshots", "insert into application_events"})
    void failedSubmissionRollsBackApplicationSnapshotAndInitialEvent(String write) throws Exception {
        var employer = register("employer"); var candidate = register("job-seeker");
        String id = job(employer, true);
        failAfterWrite(write);
        var failed = request("POST", "/api/applications", Map.of("jobId", id), candidate.access());
        assertThat(failed.status()).isGreaterThanOrEqualTo(400);
        assertThat(jdbc.queryForObject("select count(*) from applications where job_id=?", Integer.class, UUID.fromString(id))).isZero();
        // FK constraints also guarantee there can be no orphan snapshot or event.
        org.mockito.Mockito.reset(jdbc);
        assertThat(request("POST", "/api/applications", Map.of("jobId", id), candidate.access()).status()).isEqualTo(200);
    }

    @Test void failedEventWriteRollsBackStatusAndHistory() throws Exception {
        var employer = register("employer"); var candidate = register("job-seeker");
        String id = request("POST", "/api/applications", Map.of("jobId", job(employer, true)), candidate.access()).data().path("id").asText();
        failAfterWrite("insert into application_events");
        assertThat(request("PATCH", "/api/employer/applications/" + id + "/status",
            Map.of("expectedStatus", "SUBMITTED", "status", "REVIEWING", "reason", "Rollback probe"), employer.access()).status()).isGreaterThanOrEqualTo(400);
        assertThat(jdbc.queryForObject("select status from applications where id=?", String.class, UUID.fromString(id))).isEqualTo("SUBMITTED");
        assertThat(jdbc.queryForObject("select count(*) from application_events where application_id=?", Integer.class, UUID.fromString(id))).isEqualTo(1);
    }

    @Test void failedAuditRollsBackBanAndAuditRecord() throws Exception {
        var candidate = register("job-seeker");
        String id = request("GET", "/api/job-seeker/profile", null, candidate.access()).data().path("userId").asText();
        String admin = request("POST", "/api/auth/login", Map.of("email", "admin@jobsdb.local", "password", "password"), null).data().path("accessToken").asText();
        failAfterWrite("insert into audit_logs");
        assertThat(request("POST", "/api/admin/users/" + id + "/ban", Map.of("reason", "Rollback probe"), admin).status()).isGreaterThanOrEqualTo(400);
        assertThat(jdbc.queryForObject("select banned from users where id=?", Boolean.class, UUID.fromString(id))).isFalse();
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where target_id=?", Integer.class, UUID.fromString(id))).isZero();
        assertThat(request("GET", "/api/job-seeker/settings", null, candidate.access()).status()).isEqualTo(200);
    }

    @Test void realHiringFlowPreservesSnapshotAndPrivateNotes() throws Exception {
        var employer = register("employer"); var candidate = register("job-seeker"); var stranger = register("employer");
        assertThat(request("PUT","/api/employer/profile",Map.of("companyName","Example Company","website","https://example.com","description","Product team","location","Bangkok"),employer.access()).status()).isEqualTo(200);
        assertThat(request("GET","/api/employer/profile",null,employer.access()).data().path("companyName").asText()).isEqualTo("Example Company");
        String id = job(employer,true);
        assertThat(request("GET","/api/jobs/" + id,null,null).data().path("companyName").asText()).isEqualTo("Example Company");
        assertThat(request("PUT","/api/job-seeker/profile",profile("Original summary"),candidate.access()).status()).isEqualTo(200);
        var applied = request("POST","/api/applications",Map.of("jobId",id),candidate.access());
        assertThat(applied.status()).isEqualTo(200);
        String application = applied.data().path("id").asText();
        assertThat(request("PUT","/api/job-seeker/profile",profile("Changed summary"),candidate.access()).status()).isEqualTo(200);
        assertThat(request("POST","/api/applications",Map.of("jobId",id),candidate.access()).status()).isEqualTo(409);
        assertThat(request("GET","/api/employer/jobs/" + id + "/applicants/page",null,stranger.access()).status()).isEqualTo(403);
        var page = request("GET","/api/employer/jobs/" + id + "/applicants/page?size=1",null,employer.access());
        assertThat(page.data().path("totalElements").asInt()).isEqualTo(1);
        assertThat(page.data().path("content").size()).isEqualTo(1);
        var detail = request("GET","/api/employer/applications/" + application,null,employer.access());
        assertThat(detail.data().path("submission").path("profile").path("summary").asText()).isEqualTo("Original summary");
        assertThat(request("PATCH","/api/employer/applications/" + application + "/status",Map.of("expectedStatus","SUBMITTED","status","HIRED","reason","Skip review"),employer.access()).status()).isEqualTo(409);
        assertThat(request("PATCH","/api/employer/applications/" + application + "/status",Map.of("expectedStatus","SUBMITTED","status","REVIEWING","reason","Private review note"),employer.access()).status()).isEqualTo(200);
        var own = request("GET","/api/applications/" + application,null,candidate.access());
        assertThat(own.body().toString()).doesNotContain("Private review note");
        assertThat(own.data().path("timeline").size()).isEqualTo(2);
        assertThat(request("GET","/api/employer/applications/" + application,null,employer.access()).body().toString()).contains("Private review note");
        assertThat(request("GET","/api/employer/stats",null,employer.access()).data().path("reviewing").asInt()).isEqualTo(1);
    }
    @Test void draftClosedJobsAndRoleBoundariesAreEnforced() throws Exception {
        var employer = register("employer"); var candidate = register("job-seeker");
        String id = job(employer,false);
        assertThat(request("GET","/api/jobs/" + id,null,null).status()).isEqualTo(404);
        assertThat(request("POST","/api/applications",Map.of("jobId",id),candidate.access()).status()).isEqualTo(404);
        assertThat(request("GET","/api/employer/stats",null,candidate.access()).status()).isEqualTo(403);
        assertThat(request("GET","/api/employer/stats",null,null).status()).isEqualTo(401);
        assertThat(request("POST","/api/jobs",Map.of("title","","description","test","salaryMin",20,"salaryMax",10),employer.access()).status()).isEqualTo(400);
        request("PATCH","/api/jobs/" + id + "/status",Map.of("status","CLOSED"),employer.access());
        assertThat(request("POST","/api/applications",Map.of("jobId",id),candidate.access()).status()).isEqualTo(404);
        assertThat(request("GET","/api/jobs?q=no-match-" + UUID.randomUUID(),null,null).data().path("content").isEmpty()).isTrue();
    }
    @Test void refreshRotationRevocationAndTokenPurposeAreEnforced() throws Exception {
        var user = register("job-seeker");
        assertThat(request("GET","/api/job-seeker/profile",null,user.refresh()).status()).isEqualTo(401);
        assertThat(request("POST","/api/auth/refresh-token",Map.of("refreshToken",user.access()),null).status()).isEqualTo(401);
        var refreshed = request("POST","/api/auth/refresh-token",Map.of("refreshToken",user.refresh()),null);
        assertThat(refreshed.status()).isEqualTo(200);
        assertThat(refreshed.data().path("accessToken").asText()).isNotBlank().isNotEqualTo(user.access());
        assertThat(request("POST","/api/auth/refresh-token",Map.of("refreshToken",user.refresh()),null).status()).isEqualTo(401);
        String next = refreshed.data().path("refreshToken").asText();
        assertThat(request("POST","/api/auth/logout",Map.of("refreshToken",next),null).status()).isEqualTo(200);
        assertThat(request("POST","/api/auth/refresh-token",Map.of("refreshToken",next),null).status()).isEqualTo(401);
    }
    @Test void settingsAndSavedJobsPersistWithoutChangingLoginEmail() throws Exception {
        var user = register("job-seeker"); var employer = register("employer"); String id = job(employer,true);
        var settings = Map.of("displayName","Candidate","contactEmail","contact@example.com","discoverable",false,"recommendations",false);
        assertThat(request("PUT","/api/job-seeker/settings",settings,user.access()).status()).isEqualTo(200);
        assertThat(request("GET","/api/job-seeker/settings",null,user.access()).data().path("contactEmail").asText()).isEqualTo("contact@example.com");
        assertThat(request("PUT","/api/job-seeker/saved-jobs/" + id,Map.of(),user.access()).status()).isEqualTo(200);
        request("PUT","/api/job-seeker/saved-jobs/" + id,Map.of(),user.access());
        assertThat(request("GET","/api/job-seeker/saved-jobs",null,user.access()).data().size()).isEqualTo(1);
        assertThat(request("GET","/api/job-seeker/jobs/" + id + "/state",null,user.access()).data().path("saved").asBoolean()).isTrue();
        request("DELETE","/api/job-seeker/saved-jobs/" + id,null,user.access());
        assertThat(request("GET","/api/job-seeker/saved-jobs",null,user.access()).data().isEmpty()).isTrue();
    }
    @Test void concurrentRefreshHasExactlyOneWinner() throws Exception {
        var user = register("job-seeker");
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var tasks = List.<Callable<Integer>>of(
                () -> request("POST","/api/auth/refresh-token",Map.of("refreshToken",user.refresh()),null).status(),
                () -> request("POST","/api/auth/refresh-token",Map.of("refreshToken",user.refresh()),null).status());
            var results = executor.invokeAll(tasks);
            assertThat(List.of(results.get(0).get(),results.get(1).get())).containsExactlyInAnyOrder(200,401);
        }
    }

    @Test void duplicateApplicationsAndConcurrentTransitionsStayAtomic() throws Exception {
        var employer = register("employer"); var candidate = register("job-seeker");
        String job = job(employer, true);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var submissions = executor.invokeAll(List.<Callable<Reply>>of(
                () -> request("POST", "/api/applications", Map.of("jobId", job), candidate.access()),
                () -> request("POST", "/api/applications", Map.of("jobId", job), candidate.access())));
            var first = submissions.get(0).get(); var second = submissions.get(1).get();
            assertThat(List.of(first.status(), second.status())).containsExactlyInAnyOrder(200, 409);
            String id = (first.status() == 200 ? first : second).data().path("id").asText();
            var moves = executor.invokeAll(List.<Callable<Integer>>of(
                () -> request("PATCH", "/api/employer/applications/" + id + "/status", Map.of("expectedStatus", "SUBMITTED", "status", "REVIEWING", "reason", "First reviewer"), employer.access()).status(),
                () -> request("PATCH", "/api/employer/applications/" + id + "/status", Map.of("expectedStatus", "SUBMITTED", "status", "REJECTED", "reason", "Second reviewer"), employer.access()).status()));
            assertThat(List.of(moves.get(0).get(), moves.get(1).get())).containsExactlyInAnyOrder(200, 409);
            assertThat(jdbc.queryForObject("select count(*) from application_snapshots where application_id=?", Integer.class, UUID.fromString(id))).isEqualTo(1);
            assertThat(jdbc.queryForObject("select count(*) from application_events where application_id=?", Integer.class, UUID.fromString(id))).isEqualTo(2);
        }
    }

    @Test void adminPagesExcludeSecretsAndModerationIsAudited() throws Exception {
        var candidate = register("job-seeker");
        var login = request("POST", "/api/auth/login", Map.of("email", "admin@jobsdb.local", "password", "password"), null);
        assertThat(login.status()).isEqualTo(200);
        String token = login.data().path("accessToken").asText();
        var users = request("GET", "/api/admin/users/page?size=1", null, token);
        assertThat(users.status()).isEqualTo(200);
        assertThat(users.data().path("content").size()).isEqualTo(1);
        assertThat(users.body().toString()).doesNotContain("password", "tokenHash");
        assertThat(request("GET", "/api/admin/users/page", null, candidate.access()).status()).isEqualTo(403);
        String userId = request("GET", "/api/job-seeker/profile", null, candidate.access()).data().path("userId").asText();
        assertThat(request("POST", "/api/admin/users/" + userId + "/ban", Map.of("reason", "Integration moderation"), token).status()).isEqualTo(200);
        assertThat(request("GET", "/api/job-seeker/settings", null, candidate.access()).status()).isEqualTo(401);
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where target_id=? and action='BAN_USER' and reason=?", Integer.class, UUID.fromString(userId), "Integration moderation")).isEqualTo(1);
        assertThat(request("GET", "/api/admin/applications/page?size=1", null, token).data().path("content").size()).isLessThanOrEqualTo(1);
    }

    @Test void validationAndOpenApiDescribeTheNewContracts() throws Exception {
        var candidate = register("job-seeker");
        var invalid = request("PUT", "/api/job-seeker/profile", Map.of("skills", List.of(Map.of("name", ""))), candidate.access());
        assertThat(invalid.status()).isEqualTo(400);
        assertThat(invalid.body().path("success").asBoolean()).isFalse();
        assertThat(invalid.body().path("data").isNull()).isTrue();
        assertThat(request("PUT", "/api/job-seeker/profile", Map.of("resumeUrl", "javascript:alert(1)"), candidate.access()).status()).isEqualTo(400);
        var specification = request("GET", "/api-docs", null, null);
        assertThat(specification.status()).isEqualTo(200);
        var paths = specification.body().path("paths");
        assertThat(paths.has("/api/employer/applications/{applicationId}/status")).isTrue();
        assertThat(paths.path("/api/employer/applications/{applicationId}/status").path("patch").path("responses").has("409")).isTrue();
        assertThat(specification.body().path("components").path("schemas").path("ApplicationStatusRequest").path("required").toString()).contains("expectedStatus", "status", "reason");
        assertThat(specification.body().path("components").path("schemas").path("Profile").path("properties").has("skills")).isTrue();
    }

    private Map<String,Object> completeProfile() {
        var value = new HashMap<String,Object>(profile("Complete profile"));
        value.put("dateOfBirth", "1995-05-12"); value.put("expectedSalaryMin", 50000); value.put("expectedSalaryMax", 80000); value.put("salaryCurrency", "THB");
        value.put("skills", List.of(Map.of("name", "Java", "yearsOfExperience", 4, "level", "Advanced")));
        value.put("workExperiences", List.of(Map.of("company", "Example", "title", "Engineer", "startDate", "2020-01-01", "endDate", "2023-01-01", "description", "Built products")));
        value.put("educations", List.of(Map.of("institution", "Example College", "degree", "BSc", "fieldOfStudy", "Computing", "graduationYear", 2019)));
        value.put("languages", List.of(Map.of("language", "English", "proficiency", "Fluent")));
        value.put("licenses", List.of(Map.of("name", "Java Certification", "issuer", "Example", "issuedYear", 2021, "expiresYear", 2030, "description", "Professional qualification")));
        return value;
    }

    @Test void completeProfileCollectionsRoundTripReplaceAndRemainInSubmittedSnapshot() throws Exception {
        var candidate = register("job-seeker"); var employer = register("employer");
        var saved = request("PUT", "/api/job-seeker/profile", completeProfile(), candidate.access());
        assertThat(saved.status()).isEqualTo(200);
        var loaded = request("GET", "/api/job-seeker/profile", null, candidate.access()).data();
        assertThat(loaded).isEqualTo(saved.data());
        assertThat(loaded.path("dateOfBirth").asText()).isEqualTo("1995-05-12");
        assertThat(loaded.path("expectedSalary").path("min").asInt()).isEqualTo(50000);
        assertThat(loaded.path("workExperiences").get(0).path("startDate").asText()).isEqualTo("2020-01-01");
        for (String collection : List.of("skills", "workExperiences", "educations", "languages", "licenses")) assertThat(loaded.path(collection).size()).isEqualTo(1);
        String application = request("POST", "/api/applications", Map.of("jobId", job(employer, true)), candidate.access()).data().path("id").asText();
        var replaced = request("PUT", "/api/job-seeker/profile", Map.of("fullName", "Changed name"), candidate.access());
        assertThat(replaced.status()).isEqualTo(200);
        for (String collection : List.of("skills", "workExperiences", "educations", "languages", "licenses")) assertThat(replaced.data().path(collection).isEmpty()).isTrue();
        assertThat(request("GET", "/api/employer/applications/" + application, null, employer.access()).data().path("submission").path("profile")).isEqualTo(loaded);
    }

    @Test void failedNestedProfileWriteRestoresOriginalParentAndChildren() throws Exception {
        var candidate = register("job-seeker");
        var before = request("PUT", "/api/job-seeker/profile", completeProfile(), candidate.access()).data();
        var edit = completeProfile(); edit.put("fullName", "Must roll back"); edit.put("skills", List.of(Map.of("name", "Changed skill")));
        failAfterWrite("insert into licenses");
        assertThat(request("PUT", "/api/job-seeker/profile", edit, candidate.access()).status()).isGreaterThanOrEqualTo(400);
        assertThat(request("GET", "/api/job-seeker/profile", null, candidate.access()).data()).isEqualTo(before);
    }

    @Test void avatarMultipartUploadPersistsNormalizedPublicImageAndRejectsInvalidExtension() throws Exception {
        var candidate = register("job-seeker");
        var output = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(400, 200, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", output);
        var file = new org.springframework.mock.web.MockMultipartFile("file", "avatar.png", "image/png", output.toByteArray());
        var response = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/job-seeker/profile/image")
            .file(file).header("Authorization", "Bearer " + candidate.access())).andReturn().getResponse();
        assertThat(response.getStatus()).isEqualTo(200);
        String url = json.readTree(response.getContentAsString()).path("data").path("profileImageUrl").asText();
        assertThat(request("GET", "/api/job-seeker/profile", null, candidate.access()).data().path("profileImageUrl").asText()).isEqualTo(url);
        var image = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(url)).andReturn().getResponse();
        assertThat(image.getStatus()).isEqualTo(200);
        assertThat(image.getContentType()).isEqualTo("image/png");
        var decoded = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(image.getContentAsByteArray()));
        assertThat(decoded.getWidth()).isEqualTo(256); assertThat(decoded.getHeight()).isEqualTo(256);
        var invalid = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/job-seeker/profile/image")
            .file(new org.springframework.mock.web.MockMultipartFile("file", "avatar.svg", "image/svg+xml", new byte[] {1}))
            .header("Authorization", "Bearer " + candidate.access())).andReturn().getResponse();
        assertThat(invalid.getStatus()).isEqualTo(400);
    }
}
