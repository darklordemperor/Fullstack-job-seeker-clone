package com.darklordempeor.jobsdb.infrastructure.email;

import com.darklordempeor.jobsdb.application.port.EmailPort;
import org.springframework.stereotype.Component;

@Component
public class SmtpEmailAdapter implements EmailPort {
	@Override
	public void send(String to, String subject, String body) {
		// SMTP integration belongs here when mail infrastructure is configured.
	}
}
