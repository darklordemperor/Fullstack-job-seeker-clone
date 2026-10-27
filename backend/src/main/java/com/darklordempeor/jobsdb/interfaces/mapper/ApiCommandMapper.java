package com.darklordempeor.jobsdb.interfaces.mapper;

import com.darklordempeor.jobsdb.application.model.*;
import com.darklordempeor.jobsdb.interfaces.dto.request.*;
import com.darklordempeor.jobsdb.interfaces.dto.response.*;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/** Converts validated HTTP input into application-owned commands. */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface ApiCommandMapper {
    ScorecardCommand toCommand(ScorecardRequest request);
    SavedSearchCommand toCommand(SavedSearchRequest request);
    InterviewModels.Proposal toCommand(InterviewProposalRequest request);
    LoginCommand toCommand(LoginRequest request);
    RegisterCommand toCommand(RegisterRequest request);
    JobCommand toCommand(JobRequest request);
    EmployerProfileCommand toCommand(EmployerProfileRequest request);
    JobSeekerProfileCommand toCommand(JobSeekerProfileRequest request);
    AuthResponse toResponse(AuthTokens tokens);
    AdminStatsResponse toResponse(AdminStats stats);
}
