package com.planningpoker.infraestrutura.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
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
                                .csrf().disable()
                                .cors().configurationSource(corsConfigurationSource())
                                .and()
                                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                                .and()
                                .authorizeRequests()
                                // Recursos estáticos e frontend Angular (PÚBLICO - sem autenticação)
                                .antMatchers("/", "/index.html", "/favicon.ico", "/*.js", "/*.css",
                                                "/*.ico", "/*.png",
                                                "/*.jpg", "/*.svg", "/*.woff", "/*.woff2", "/*.ttf",
                                                "/*.eot")
                                .permitAll()
                                .antMatchers("/assets/**").permitAll()

                                // Rotas do Angular Router (SPA) - Servem index.html
                                .antMatchers("/boards", "/boards/**", "/poker-room/**", "/login",
                                                "/register", "/join/**",
                                                "/auth/**")
                                .permitAll()

                                // Rota de fallback para erros
                                .antMatchers("/error").permitAll()

                                // Endpoints públicos de API
                                .antMatchers("/api/v1/auth/**").permitAll()
                                // Endpoint de animação (bolinhas/emojis) - permitir POST explicitamente
                                // Usar * para um único segmento (ID da sessão) - ** não pode ter nada depois
                                .antMatchers(HttpMethod.POST, "/api/v1/poker/sessions/*/animation").permitAll()
                                .antMatchers("/swagger-ui/**", "/api-docs/**", "/swagger-ui.html", "/v3/api-docs/**")
                                .permitAll()
                                .antMatchers("/h2-console/**").permitAll()
                                .antMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                                // WebSocket endpoint - permitir para handshake inicial
                                .antMatchers("/ws/**").permitAll()

                                // Demais endpoints requerem autenticação
                                .anyRequest().authenticated()
                                .and()
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
                                "https://*"));
                restConfiguration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
                restConfiguration.setAllowedHeaders(List.of("*"));
                restConfiguration.setExposedHeaders(List.of("Authorization"));
                restConfiguration.setAllowCredentials(true); // Permitir credenciais para JWT

                // Configuração específica para WebSocket SockJS
                // O WebSocket não precisa de autenticação JWT - a sessão é identificada pelo ID
                // Esta configuração é usada pelo Spring Security para processar requisições
                // HTTP
                // feitas pelo SockJS antes que o Spring WebSocket processe
                // Permitir credenciais para evitar erros de CORS quando o SockJS envia
                // credenciais
                CorsConfiguration wsConfiguration = new CorsConfiguration();
                wsConfiguration.setAllowedOriginPatterns(List.of(
                                "http://localhost:*",
                                "http://127.0.0.1:*",
                                "https://*"));
                wsConfiguration.setAllowedMethods(Arrays.asList("GET", "POST", "OPTIONS"));
                wsConfiguration.setAllowedHeaders(List.of("*"));
                wsConfiguration.setAllowCredentials(true); // Permitir credenciais para evitar erros de CORS

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/api/**", restConfiguration);
                // Registrar CORS para /ws/** ANTES da configuração padrão
                // Isso garante que endpoints SockJS como /ws/poker/info recebam headers CORS
                // corretos
                source.registerCorsConfiguration("/ws/**", wsConfiguration);
                // Configuração padrão para outros endpoints (deve vir por último)
                source.registerCorsConfiguration("/**", restConfiguration);
                return source;
        }
}
