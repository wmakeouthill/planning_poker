package com.planningpoker.infraestrutura.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Configuração de segurança da aplicação.
 * Baseado no projeto Soneca Delivery que funciona corretamente.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Recursos estáticos e frontend Angular (PÚBLICO - sem autenticação)
                        .requestMatchers("/", "/index.html", "/favicon.ico", "/*.js", "/*.css", "/*.ico", "/*.png",
                                "/*.jpg", "/*.svg", "/*.woff", "/*.woff2", "/*.ttf", "/*.eot")
                        .permitAll()
                        .requestMatchers("/assets/**").permitAll()
                        
                        // Rotas do Angular Router (SPA) - Servem index.html
                        .requestMatchers("/boards", "/boards/**", "/poker-room/**", "/login", "/register", "/join/**",
                                "/auth/**")
                        .permitAll()
                        
                        // Rota de fallback para erros
                        .requestMatchers("/error").permitAll()
                        
                        // Endpoints públicos de API
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/api-docs/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/h2-console/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        
                        // WebSocket endpoint - permitir para handshake inicial
                        .requestMatchers("/ws/**").permitAll()
                        
                        // Demais endpoints requerem autenticação
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        // Configuração para endpoints REST (permite credenciais para JWT)
        CorsConfiguration restConfiguration = new CorsConfiguration();
        restConfiguration.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://*"
        ));
        restConfiguration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        restConfiguration.setAllowedHeaders(List.of("*"));
        restConfiguration.setExposedHeaders(List.of("Authorization"));
        restConfiguration.setAllowCredentials(true); // Permitir credenciais para JWT

        // Configuração para WebSocket (não permite credenciais para evitar problemas de CORS)
        CorsConfiguration wsConfiguration = new CorsConfiguration();
        wsConfiguration.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://*"
        ));
        wsConfiguration.setAllowedMethods(Arrays.asList("GET", "POST", "OPTIONS"));
        wsConfiguration.setAllowedHeaders(List.of("*"));
        wsConfiguration.setAllowCredentials(false); // WebSocket não precisa de credenciais

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", restConfiguration);
        source.registerCorsConfiguration("/ws/**", wsConfiguration);
        // Configuração padrão para outros endpoints
        source.registerCorsConfiguration("/**", restConfiguration);
        return source;
    }
}
