package com.planningpoker.infraestrutura.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuração do Spring MVC para servir o frontend Angular na raiz.
 * 
 * Em produção:
 * - Serve recursos estáticos de classpath:/static/ (copiados pelo Maven)
 * 
 * Esta configuração adiciona suporte para rotas do Angular Router (SPA):
 * - Raiz (/) retorna index.html
 * - Rotas do Angular (ex: /boards, /poker-room) retornam index.html
 * - Rotas /api/** são ignoradas e tratadas pelos controllers REST
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final Environment environment;

    public WebMvcConfig(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        boolean isProd = environment.matchesProfiles("prod");
        
        if (isProd) {
            // ✅ MODO PRODUÇÃO: Serve do classpath (arquivos copiados pelo Maven)
            registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(3600); // Cache de 1 hora em produção
        }
        // Em desenvolvimento, o frontend roda separadamente (docker-compose)
    }

    @Override
    public void addViewControllers(@NonNull ViewControllerRegistry registry) {
        // Mapeia a raiz para index.html (SPA fallback)
        // Isso permite que rotas do Angular Router funcionem corretamente
        registry.addViewController("/").setViewName("forward:/index.html");
    }
}

