package com.darklordempeor.jobsdb.application.port;

public interface EmailPort {
	void send(String to, String subject, String body);
}
