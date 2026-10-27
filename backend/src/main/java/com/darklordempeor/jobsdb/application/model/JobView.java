package com.darklordempeor.jobsdb.application.model;
import com.darklordempeor.jobsdb.domain.model.Job;
public record JobView(Job job, String companyName, long applicants) {}
