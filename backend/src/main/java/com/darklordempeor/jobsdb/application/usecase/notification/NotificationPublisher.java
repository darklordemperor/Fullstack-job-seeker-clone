package com.darklordempeor.jobsdb.application.usecase.notification;

import com.darklordempeor.jobsdb.application.port.NotificationPort;
import com.darklordempeor.jobsdb.application.model.NotificationModels.Draft;
import com.darklordempeor.jobsdb.application.model.HiringModels.ApplicationView;
import com.darklordempeor.jobsdb.domain.model.*;
import com.darklordempeor.jobsdb.domain.model.Notification.Kind;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

/** Joins the workflow transaction; a failed notification rolls back the business event too. */
@Service
@Transactional(propagation=Propagation.MANDATORY)
public class NotificationPublisher {
    private final NotificationPort port;
    public NotificationPublisher(NotificationPort port) { this.port = port; }
    public void submitted(JobApplication application, Job job) {
        port.publish(new Draft(job.employerId(), "application:"+application.id()+":submitted", Kind.NEW_APPLICATION,
            "New application", "A candidate applied for " + job.title() + ".",
            "/employer/applicants/"+job.id()+"?applicationId="+application.id()));
    }
    public void statusChanged(ApplicationView application) {
        port.publish(new Draft(application.jobSeekerId(), "application:"+application.id()+":"+application.status(), Kind.APPLICATION_STATUS,
            "Application update", "Your application for "+application.jobTitle()+" is now "+application.status()+".",
            "/job-seeker/my-applications?applicationId="+application.id()));
    }
    public void interview(Interview interview, Kind kind, UUID recipient) {
        String title = switch (kind) {
            case INTERVIEW_PROPOSED -> "Interview invitation";
            case INTERVIEW_RESCHEDULED -> "New interview times";
            case INTERVIEW_CONFIRMED -> "Interview confirmed";
            case INTERVIEW_DECLINED -> "Interview declined";
            case INTERVIEW_CANCELLED -> "Interview cancelled";
            case INTERVIEW_COMPLETED -> "Interview completed";
            case INTERVIEW_NO_SHOW -> "Interview marked as no-show";
            default -> throw new IllegalArgumentException("Expected an interview event");
        };
        String viewer = recipient.equals(interview.employerId()) ? "employer" : "job-seeker";
        port.publish(new Draft(recipient,"interview:"+interview.id()+":"+interview.version(),kind,title,
            "Open the interview to review its latest details.","/"+viewer+"/interviews?interviewId="+interview.id()));
    }
}
