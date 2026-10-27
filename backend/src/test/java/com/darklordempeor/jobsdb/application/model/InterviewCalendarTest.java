package com.darklordempeor.jobsdb.application.model;
import com.darklordempeor.jobsdb.domain.model.Interview;
import com.darklordempeor.jobsdb.domain.exception.ConflictException;
import java.time.Instant;
import java.util.*;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class InterviewCalendarTest {
    @Test void exportsUtcTimesEscapesInjectionAndFoldsUtf8WithoutSplittingCharacters() {
        var now=Instant.parse("2026-11-01T03:00:00Z"); var slot=new Interview.Slot(UUID.randomUUID(),now,now.plusSeconds(3600));
        var view=new InterviewModels.View(UUID.randomUUID(),UUID.randomUUID(),"นักพัฒนา".repeat(30)+"\r\nATTENDEE:evil","Team, Inc.;","Name",Interview.Status.CONFIRMED,Interview.Mode.IN_PERSON,"Room\nX","Asia/Bangkok",List.of(slot),slot.id(),3,now,1);
        var file=InterviewCalendar.export(view);
        assertThat(file.filename()).endsWith(".ics");
        assertThat(file.content()).contains("DTSTART:20261101T030000Z\r\n","SEQUENCE:3\r\n").doesNotContain("\r\nATTENDEE:");
        for (String line:file.content().split("\r\n")) assertThat(line.getBytes(StandardCharsets.UTF_8).length).isLessThanOrEqualTo(75);
        assertThat(file.content().replace("\r\n ","")).contains("\\nATTENDEE:evil","Team\\, Inc.\\;");
        var proposed=new InterviewModels.View(view.id(),view.applicationId(),view.jobTitle(),view.companyName(),view.candidateName(),Interview.Status.PROPOSED,view.mode(),view.location(),view.timezone(),view.slots(),null,0,now,1);
        assertThatThrownBy(() -> InterviewCalendar.export(proposed)).isInstanceOf(ConflictException.class);
    }
}
