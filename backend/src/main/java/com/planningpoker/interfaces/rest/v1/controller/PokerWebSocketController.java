package com.planningpoker.interfaces.rest.v1.controller;

import com.planningpoker.aplicacao.ServicoPokerSession;
import com.planningpoker.dominio.dto.PokerSessionUpdateDTO;
import com.planningpoker.dominio.event.PokerSessionEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Componente para notificações WebSocket em tempo real.
 * Escuta eventos de PokerSession e notifica os clientes via WebSocket.
 */
@Slf4j
@RequiredArgsConstructor
@Component
public class PokerWebSocketController {

    private final ServicoPokerSession servicoPokerSession;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Escuta eventos de atualização de sessão e notifica os clientes.
     */
    @EventListener
    public void handlePokerSessionEvent(PokerSessionEvent event) {
        try {
            var dto = servicoPokerSession.buscarPorId(event.getSessionId(), null);
            var update = new PokerSessionUpdateDTO(
                    dto.id(),
                    dto.name(),
                    dto.status(),
                    dto.votes(),
                    dto.averageVote(),
                    dto.revealedAt(),
                    event.getEventType());

            messagingTemplate.convertAndSend("/topic/poker/session/" + event.getSessionId(), update);
            log.debug("Notificação enviada para sessão {}: {}", event.getSessionId(), event.getEventType());
        } catch (Exception e) {
            log.error("Erro ao notificar atualização da sessão {}", event.getSessionId(), e);
        }
    }
}
