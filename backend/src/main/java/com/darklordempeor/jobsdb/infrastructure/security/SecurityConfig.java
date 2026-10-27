package com.darklordempeor.jobsdb.infrastructure.security;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {
	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
		return http
				.csrf(AbstractHttpConfigurer::disable)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                    .authenticationEntryPoint((request, response, ex) -> writeError(response, 401, "Authentication required"))
                    .accessDeniedHandler((request, response, ex) -> writeError(response, 403, "Access denied")))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/api/auth/**", "/swagger-ui.html", "/swagger-ui/**", "/api-docs/**", "/uploads/**", "/error").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/jobs", "/api/jobs/**").permitAll()
						.requestMatchers(HttpMethod.POST, "/api/jobs").hasAuthority("ROLE_EMPLOYER")
						.requestMatchers(HttpMethod.PUT, "/api/jobs/*").hasAuthority("ROLE_EMPLOYER")
						.requestMatchers(HttpMethod.PATCH, "/api/jobs/*/status").hasAuthority("ROLE_EMPLOYER")
						.requestMatchers("/api/job-seeker/**", "/api/applications/**").hasAuthority("ROLE_JOB_SEEKER")
						.requestMatchers("/api/employer/**").hasAuthority("ROLE_EMPLOYER")
						.requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")
						.anyRequest().authenticated())
				.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
				.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

    private void writeError(jakarta.servlet.http.HttpServletResponse response, int status, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"" + message
                + "\",\"timestamp\":\"" + java.time.Instant.now() + "\"}");
    }
}
