package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;

public interface AdminQueryPort {
    Page<UserView> users(int page, int size);
    Page<ApplicationView> allApplications(int page, int size);
}
