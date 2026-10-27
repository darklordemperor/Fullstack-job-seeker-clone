package com.darklordempeor.jobsdb.application.port;

public interface PasswordHashPort {
    String encode(CharSequence password);
    boolean matches(CharSequence password, String encoded);
}
