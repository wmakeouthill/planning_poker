package com.planningpoker.infraestrutura.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

/**
 * Configuração de CORS para permitir requisições do frontend.
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // Permitir origens do frontend (desenvolvimento)
        config.setAllowedOrigins(List.of(
                "http://localhost:4200",
                "http://localhost:5173",
                "http://127.0.0.1:4200",
                "http://127.0.0.1:5173"));

        // Permitir todos os métodos HTTP
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Permitir todos os headers
        config.setAllowedHeaders(List.of("*"));

        // Permitir credenciais
        config.setAllowCredentials(true);

        // Expor headers de resposta
        config.setExposedHeaders(List.of("Authorization", "Content-Type"));

        // Tempo de cache do preflight
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
