package com.planningpoker.dominio.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Evento publicado quando uma sessão de poker é atualizada.
 */
@Getter
public class PokerSessionEvent extends ApplicationEvent {
    private final Long sessionId;
    private final String eventType; // "VOTE", "REVEAL", "RESET", "CLOSED", "CREATED"
    private final Long novaSessaoId; // ID da nova sessão (usado quando CLOSED por nova rodada)

    public PokerSessionEvent(Object source, Long sessionId, String eventType) {
        super(source);
        this.sessionId = sessionId;
        this.eventType = eventType;
        this.novaSessaoId = null;
    }

    public PokerSessionEvent(Object source, Long sessionId, String eventType, Long novaSessaoId) {
        super(source);
        this.sessionId = sessionId;
        this.eventType = eventType;
        this.novaSessaoId = novaSessaoId;
    }
}
