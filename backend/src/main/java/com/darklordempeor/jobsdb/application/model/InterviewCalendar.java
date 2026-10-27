package com.darklordempeor.jobsdb.application.model;
import com.darklordempeor.jobsdb.domain.exception.ConflictException;
import com.darklordempeor.jobsdb.domain.model.Interview;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.nio.charset.StandardCharsets;

public final class InterviewCalendar {
    private InterviewCalendar() {}
    public record File(String filename, String content) {}
    public static File export(InterviewModels.View interview) {
        if (interview.status() != Interview.Status.CONFIRMED) throw new ConflictException("Calendar export requires a confirmed interview");
        var slot = interview.slots().stream().filter(s -> s.id().equals(interview.selectedSlotId())).findFirst().orElseThrow();
        var format = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
        String text = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//JobsDB Clone//Interviews//EN\r\nBEGIN:VEVENT\r\nUID:" + interview.id() + "@jobsdb.local\r\nSEQUENCE:" + interview.version()
            + "\r\nDTSTAMP:" + format.format(interview.updatedAt()) + "\r\nDTSTART:" + format.format(slot.startsAt()) + "\r\nDTEND:" + format.format(slot.endsAt())
            + "\r\nSUMMARY:" + escape("Interview: " + interview.jobTitle()) + "\r\nLOCATION:" + escape(interview.location())
            + "\r\nDESCRIPTION:" + escape("Interview with " + interview.companyName() + ". Check the app for schedule updates.") + "\r\nSTATUS:CONFIRMED\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
        var folded = new StringBuilder();
        for (String line : text.split("\r\n")) {
            int bytes = 0;
            for (int point : line.codePoints().toArray()) {
                String value = new String(Character.toChars(point)); int length = value.getBytes(StandardCharsets.UTF_8).length;
                if (bytes + length > 75) { folded.append("\r\n "); bytes = 1; }
                folded.append(value); bytes += length;
            }
            folded.append("\r\n");
        }
        return new File("interview-" + interview.id() + ".ics", folded.toString());
    }
    private static String escape(String value) { return value.replace("\\", "\\\\").replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\\n").replace(";", "\\;").replace(",", "\\,"); }
}
