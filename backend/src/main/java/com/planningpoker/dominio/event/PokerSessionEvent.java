package com.planningpoker.dominio.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Evento publicado quando uma sessão de poker é atualizada.
 */
@Getter
public class PokerSessionEvent extends ApplicationEvent {
    private final Long sessionId;
    private final String eventType; // "VOTE", "REVEAL", "RESET"

    public PokerSessionEvent(Object source, Long sessionId, String eventType) {
        super(source);
        this.sessionId = sessionId;
        this.eventType = eventType;
    }
}

