package com.darklordempeor.jobsdb.domain.service;

import com.darklordempeor.jobsdb.domain.exception.DomainException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ResumeRulesTest {
    private byte[] pdf(String text) { return text.getBytes(StandardCharsets.US_ASCII); }
    @Test void acceptsSupportedSignaturesAndSanitizesFilenames() {
        assertThat(ResumeRules.validate("C:\\fakepath\\CV.pdf","application/pdf",pdf("%PDF-1.7\n%%EOF\n"))).isEqualTo("CV.pdf");
        assertThat(ResumeRules.validate("../CV\r\n.PDF","APPLICATION/PDF",pdf("%PDF-2.0\n%%EOF"))).isEqualTo("CV.PDF");
        assertThat(ResumeRules.validate("a".repeat(200)+".pdf","application/pdf",pdf("%PDF-1.0\n%%EOF"))).hasSize(180).endsWith(".pdf");
        byte[] maximum = new byte[ResumeRules.MAX_BYTES];
        System.arraycopy(pdf("%PDF-1.7"),0,maximum,0,8);
        System.arraycopy(pdf("%%EOF"),0,maximum,maximum.length-5,5);
        assertThat(ResumeRules.validate("maximum.pdf","application/pdf",maximum)).isEqualTo("maximum.pdf");
    }
    @Test void rejectsMissingEmptyOversizedOrDisguisedFiles() {
        for (byte[] content : new byte[][] {null,new byte[0],new byte[ResumeRules.MAX_BYTES+1]})
            assertThatThrownBy(() -> ResumeRules.validate("cv.pdf","application/pdf",content)).isInstanceOf(DomainException.class);
        for (String name : new String[] {null,"cv.png","cv.pdf.exe"})
            assertThatThrownBy(() -> ResumeRules.validate(name,"application/pdf",pdf("%PDF-1.7\n%%EOF"))).isInstanceOf(DomainException.class);
        for (String type : new String[] {null,"text/html"})
            assertThatThrownBy(() -> ResumeRules.validate("cv.pdf",type,pdf("%PDF-1.7\n%%EOF"))).isInstanceOf(DomainException.class);
        for (String content : new String[] {"x","<html>bad</html>","%PDF-1.7\ntruncated","%PDF-9.9\n%%EOF","%PDF-1.7\n%%EOF trailing"})
            assertThatThrownBy(() -> ResumeRules.validate("cv.pdf","application/pdf",pdf(content))).isInstanceOf(DomainException.class);
    }
}
