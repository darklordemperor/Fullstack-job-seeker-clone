package com.darklordempeor.jobsdb.infrastructure.security;

import com.darklordempeor.jobsdb.application.port.PasswordHashPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class PasswordHashAdapter implements PasswordHashPort {
    private final PasswordEncoder encoder;
    public PasswordHashAdapter(PasswordEncoder encoder) { this.encoder = encoder; }
    public String encode(CharSequence password) { return encoder.encode(password); }
    public boolean matches(CharSequence password, String encoded) { return encoder.matches(password, encoded); }
}
