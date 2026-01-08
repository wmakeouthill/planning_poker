package com.planningpoker.interfaces.rest.v1.controller;

import com.planningpoker.aplicacao.ServicoPokerSession;
import com.planningpoker.dominio.dto.PokerSessionUpdateDTO;
import com.planningpoker.dominio.event.PokerSessionEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

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
     * Usa AFTER_COMMIT para garantir que os dados já foram persistidos no banco.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePokerSessionEvent(PokerSessionEvent event) {
        log.info("Processando evento {} para sessão {} (novaSessaoId={})",
                event.getEventType(), event.getSessionId(), event.getNovaSessaoId());
        try {
            var dto = servicoPokerSession.buscarPorId(event.getSessionId(), null);
            var update = new PokerSessionUpdateDTO(
                    dto.id(),
                    dto.name(),
                    dto.status(),
                    dto.votes(),
                    dto.averageVote(),
                    dto.revealedAt(),
                    event.getEventType(),
                    event.getNovaSessaoId());

            messagingTemplate.convertAndSend("/topic/poker/session/" + event.getSessionId(), update);
            log.info("Notificação WebSocket enviada para sessão {}: {} (novaSessaoId={}, status={})",
                    event.getSessionId(), event.getEventType(), event.getNovaSessaoId(), dto.status());
        } catch (Exception e) {
            log.error("Erro ao notificar atualização da sessão {}: {}", event.getSessionId(), e.getMessage(), e);
        }
    }
}
