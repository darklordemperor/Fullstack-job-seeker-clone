package com.darklordempeor.jobsdb.domain.service;

import com.darklordempeor.jobsdb.domain.model.*;
import com.darklordempeor.jobsdb.domain.exception.*;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class ScorecardRulesTest {
    Scorecard.Feedback feedback(Integer a,Integer b,Integer c,String strengths,String concerns,Scorecard.Recommendation recommendation) {
        return new Scorecard.Feedback(a,b,c,strengths,concerns,recommendation);
    }
    @Test void draftsNormalizeOptionalFieldsAndFinalRequiresEvidence() {
        assertThat(ScorecardRules.normalize(feedback(null,null,null,null,null,null),false).strengths()).isEmpty();
        assertThat(ScorecardRules.normalize(feedback(1,3,5,"  Evidence  "," ",Scorecard.Recommendation.HIRE),true).strengths()).isEqualTo("Evidence");
        assertThat(ScorecardRules.normalize(feedback(5,1,3,"","Concern",Scorecard.Recommendation.HOLD),true).concerns()).isEqualTo("Concern");
        for (var value : new Scorecard.Feedback[]{
            feedback(null,3,3,"e","",Scorecard.Recommendation.HIRE), feedback(3,null,3,"e","",Scorecard.Recommendation.HIRE),
            feedback(3,3,null,"e","",Scorecard.Recommendation.HIRE), feedback(3,3,3,"e","",null),
            feedback(3,3,3," "," ",Scorecard.Recommendation.HIRE)})
            assertThatThrownBy(()->ScorecardRules.normalize(value,true)).isInstanceOf(DomainException.class);
        assertThatThrownBy(()->ScorecardRules.normalize(null,false)).isInstanceOf(DomainException.class);
        for (int rating : new int[]{0,6}) assertThatThrownBy(()->ScorecardRules.normalize(feedback(rating,3,3,"","",null),false)).isInstanceOf(DomainException.class);
        for (var value : new Scorecard.Feedback[]{feedback(3,3,3,"a".repeat(2001),"",null),feedback(3,3,3,"","a".repeat(2001),null)})
            assertThatThrownBy(()->ScorecardRules.normalize(value,false)).isInstanceOf(DomainException.class);
        assertThat(ScorecardRules.normalize(feedback(3,3,3,"a".repeat(2000),"",null),false).strengths()).hasSize(2000);
    }
    @Test void lifecycleAndVersionsPreventLostUpdatesAndReopening() {
        var draft=new Scorecard(UUID.randomUUID(),2,Scorecard.Status.DRAFT,null,Instant.now(),null);
        var finalized=new Scorecard(draft.interviewId(),3,Scorecard.Status.FINALIZED,null,Instant.now(),Instant.now());
        for(var status:Interview.Status.values()) {
            if(status==Interview.Status.PROPOSED || status==Interview.Status.CONFIRMED || status==Interview.Status.COMPLETED)
                ScorecardRules.editable(draft,2,status,false);
            else assertThatThrownBy(()->ScorecardRules.editable(draft,2,status,false)).isInstanceOf(ConflictException.class);
        }
        ScorecardRules.editable(null,0,Interview.Status.PROPOSED,false);
        ScorecardRules.editable(draft,2,Interview.Status.COMPLETED,true);
        assertThatThrownBy(()->ScorecardRules.editable(null,-1,Interview.Status.PROPOSED,false)).isInstanceOf(DomainException.class);
        assertThatThrownBy(()->ScorecardRules.editable(null,1,Interview.Status.PROPOSED,false)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(()->ScorecardRules.editable(draft,1,Interview.Status.COMPLETED,false)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(()->ScorecardRules.editable(finalized,3,Interview.Status.COMPLETED,false)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(()->ScorecardRules.editable(draft,2,Interview.Status.CONFIRMED,true)).isInstanceOf(ConflictException.class);
    }
}
