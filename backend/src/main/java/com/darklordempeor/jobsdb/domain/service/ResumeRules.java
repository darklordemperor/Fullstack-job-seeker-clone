package com.darklordempeor.jobsdb.domain.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import com.darklordempeor.jobsdb.domain.exception.DomainException;

/** Bounded PDF signature validation, not a PDF parser or malware scanner. Downloads are attachment-only. */
public final class ResumeRules {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    public static final int MAX_VERSIONS = 10;
    private ResumeRules() {}

    public static String validate(String filename, String contentType, byte[] bytes) {
        if (bytes == null || bytes.length == 0 || bytes.length > MAX_BYTES)
            throw new DomainException("Choose a PDF between 1 byte and 5 MB");
        if (filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".pdf")
                || !"application/pdf".equalsIgnoreCase(contentType))
            throw new DomainException("Only PDF files are accepted");
        String header = new String(bytes, 0, Math.min(8, bytes.length), StandardCharsets.US_ASCII);
        String tail = new String(bytes, Math.max(0, bytes.length - 1024), Math.min(1024, bytes.length), StandardCharsets.US_ASCII);
        if (!header.matches("%PDF-(1\\.[0-7]|2\\.0)") || !tail.stripTrailing().endsWith("%%EOF"))
            throw new DomainException("The file does not have a supported PDF signature and end marker");
        String leaf = filename.replace('\\', '/');
        leaf = leaf.substring(leaf.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").trim();
        if (leaf.length() > 180) leaf = leaf.substring(0, 176) + ".pdf";
        return leaf;
    }
}
