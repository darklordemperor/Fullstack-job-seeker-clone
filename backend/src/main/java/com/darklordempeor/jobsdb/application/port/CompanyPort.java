package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import java.util.UUID;

public interface CompanyPort {
    Company company(UUID userId);
    Company saveCompany(Company company);
}
