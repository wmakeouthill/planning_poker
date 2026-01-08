package com.planningpoker.dominio.dto;

/**
 * DTO para eventos de animação (emoji ou bola de papel).
 */
public record AnimationEventDTO(
        String id,
        String type, // "paper-ball" ou "emoji"
        Long sessionId,
        String participantName,
        String targetCard, // opcional - carta alvo
        String emoji, // opcional - emoji arremessado
        Double startX,
        Double startY,
        Double endX,
        Double endY,
        Long timestamp
) {
}
