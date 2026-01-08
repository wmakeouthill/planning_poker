package com.planningpoker.infraestrutura.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuração de WebSocket para comunicação em tempo real.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Habilita um broker simples em memória para enviar mensagens aos clientes
        config.enableSimpleBroker("/topic", "/queue");
        // Prefixo para mensagens destinadas aos métodos anotados com @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Registra o endpoint WebSocket
        // Permitir origens específicas para evitar problemas de CORS com credenciais
        // Usar padrões ao invés de * para evitar conflito com credenciais
        registry.addEndpoint("/ws/poker")
                .setAllowedOriginPatterns(
                    "http://localhost:*",
                    "http://127.0.0.1:*",
                    "https://*"
                )
                .withSockJS();
    }
}

