package com.darklordempeor.jobsdb.application.usecase.jobseeker;
import com.darklordempeor.jobsdb.application.model.*;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.application.port.SavedSearchPort;
import com.darklordempeor.jobsdb.application.usecase.employer.JobEnrichment;
import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.domain.model.SavedSearch;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional
public class SavedSearchUseCase {
    private final SavedSearchPort searches;
    private final JobEnrichment enrichment;
    public SavedSearchUseCase(SavedSearchPort searches, JobEnrichment enrichment) { this.searches=searches; this.enrichment=enrichment; }
    @Transactional(readOnly=true)
    public List<SavedSearch> list(UUID user) { return searches.list(user); }
    public SavedSearch create(UUID user, SavedSearchCommand input) {
        String name=text(input.name()), query=text(input.query()), location=text(input.location());
        Integer min=input.salaryMin(), max=input.salaryMax();
        String currency=text(input.currency()).toUpperCase(Locale.ROOT);
        if (name.isEmpty() || name.length()>80 || query.length()>150 || location.length()>100)
            throw new DomainException("Provide a name up to 80 characters, keyword up to 150 and location up to 100");
        if ((min!=null && min<0) || (max!=null && max<0) || (min!=null && max!=null && min>max))
            throw new DomainException("Salary range must be non-negative and minimum cannot exceed maximum");
        if (min==null && max==null) currency="";
        else if (!currency.matches("[A-Z]{3}")) throw new DomainException("Salary filters require a three-letter currency code");
        if (query.isEmpty() && location.isEmpty() && min==null && max==null)
            throw new DomainException("Choose a keyword, location or salary filter");
        return searches.create(user,new SavedSearchCommand(name,query,location,min,max,currency));
    }
    public SavedSearch setEnabled(UUID user, UUID id, boolean enabled) { return searches.setEnabled(user,id,enabled); }
    public void delete(UUID user, UUID id) { searches.delete(user,id); }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Page<JobView> matches(UUID user, UUID id, int page) {
        var result=searches.matches(user,id,Math.max(0,page),8);
        return new Page<>(enrichment.enrich(result.content()),result.totalElements(),result.totalPages(),result.page());
    }
    private String text(String value) { return value==null ? "" : value.strip(); }
}
