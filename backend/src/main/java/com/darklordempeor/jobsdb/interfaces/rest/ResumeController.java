package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.jobseeker.ResumeUseCase;
import com.darklordempeor.jobsdb.domain.model.Resume;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Tag(name="Private resumes", description="Candidate PDF versions and immutable application attachments; no public file URLs")
@SecurityRequirement(name="bearer-jwt")
@io.swagger.v3.oas.annotations.responses.ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="400",description="Invalid PDF, filename, type or size; standard error envelope"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="401",description="Missing or invalid access token"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="403",description="Wrong role"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="404",description="Not found or not owned by caller"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="409",description="Ten-version limit or attachment retained by a submitted application"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="413",description="Multipart transport size limit exceeded")
})
public class ResumeController {
    private final ResumeUseCase resumes;
    public ResumeController(ResumeUseCase resumes) { this.resumes = resumes; }
    @GetMapping("/api/job-seeker/resumes")
    @Operation(summary="List my resume versions",description="At most 10 metadata-only items, newest first. current indicates the version for future submissions; attached versions cannot be deleted. No owner IDs or document bytes returned.")
    public ApiResponse<List<Resume.Version>> list(Principal p) { return ApiResponse.success(resumes.list(id(p)),"Resumes loaded"); }
    @PostMapping(value="/api/job-seeker/resumes",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary="Upload a PDF and select it for future applications",description="Required multipart file: .pdf, application/pdf, up to 5 MiB. PDF header and end marker checked, not malware scanned. Creates an immutable version and selects it atomically. Existing application attachments remain unchanged.")
    public ApiResponse<Resume.Version> upload(Principal p,@RequestPart("file") MultipartFile file) throws IOException {
        return ApiResponse.success(resumes.upload(id(p),file.getOriginalFilename(),file.getContentType(),file.getBytes()),"Resume uploaded");
    }
    @PutMapping("/api/job-seeker/resumes/{resumeId}/current")
    @Operation(summary="Select an owned resume for future applications",description="Idempotent; no effect on existing submissions.")
    public ApiResponse<Void> select(Principal p,@PathVariable UUID resumeId) { resumes.select(id(p),resumeId); return ApiResponse.success(null,"Resume selected"); }
    @DeleteMapping("/api/job-seeker/resumes/current")
    @Operation(summary="Stop attaching a private PDF to future applications",description="Retains all files and submitted attachments. Existing external resumeUrl remains supported.")
    public ApiResponse<Void> clear(Principal p) { resumes.clear(id(p)); return ApiResponse.success(null,"Resume selection cleared"); }
    @DeleteMapping("/api/job-seeker/resumes/{resumeId}")
    @Operation(summary="Delete an unused version",description="Permanently deletes metadata and bytes together. Returns 409 if any application references this version. Deleting the selected version leaves no selection; it does not select an older version automatically.")
    public ApiResponse<Void> delete(Principal p,@PathVariable UUID resumeId) { resumes.delete(id(p),resumeId); return ApiResponse.success(null,"Resume deleted"); }
    @GetMapping(value="/api/job-seeker/resumes/{resumeId}/file",produces=MediaType.APPLICATION_PDF_VALUE)
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="200",description="Private PDF attachment",content=@io.swagger.v3.oas.annotations.media.Content(mediaType="application/pdf",schema=@io.swagger.v3.oas.annotations.media.Schema(type="string",format="binary")))
    @Operation(summary="Download my private PDF",description="Binary attachment response, no-store. Errors use the standard JSON envelope.")
    public ResponseEntity<byte[]> download(Principal p,@PathVariable UUID resumeId) { return file(resumes.download(id(p),resumeId)); }
    @GetMapping(value="/api/applications/{applicationId}/resume",produces=MediaType.APPLICATION_PDF_VALUE)
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="200",description="Submitted PDF attachment",content=@io.swagger.v3.oas.annotations.media.Content(mediaType="application/pdf",schema=@io.swagger.v3.oas.annotations.media.Schema(type="string",format="binary")))
    @Operation(summary="Download the PDF submitted with my application",description="Candidate owner only; returns 404 when no attachment was captured. Never substitutes the current resume.")
    public ResponseEntity<byte[]> candidate(Principal p,@PathVariable UUID applicationId) { return file(resumes.applicationDownload(id(p),applicationId,false)); }
    @GetMapping(value="/api/employer/applications/{applicationId}/resume",produces=MediaType.APPLICATION_PDF_VALUE)
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="200",description="Applicant PDF attachment",content=@io.swagger.v3.oas.annotations.media.Content(mediaType="application/pdf",schema=@io.swagger.v3.oas.annotations.media.Schema(type="string",format="binary")))
    @Operation(summary="Download an applicant's submitted PDF",description="Owner of the application's job only. Does not allow browsing the candidate's other resume versions. Binary no-store attachment; errors use the JSON envelope.")
    public ResponseEntity<byte[]> employer(Principal p,@PathVariable UUID applicationId) { return file(resumes.applicationDownload(id(p),applicationId,true)); }
    private ResponseEntity<byte[]> file(Resume.Download document) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).cacheControl(CacheControl.noStore())
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(document.fileName(),StandardCharsets.UTF_8).build().toString())
            .header("X-Content-Type-Options","nosniff").contentLength(document.content().length).body(document.content());
    }
    private UUID id(Principal p) { return UUID.fromString(p.getName()); }
}
