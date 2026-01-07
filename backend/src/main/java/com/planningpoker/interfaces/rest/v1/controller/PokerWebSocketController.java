package com.planningpoker.interfaces.rest.v1.controller;

import com.planningpoker.aplicacao.ServicoPokerSession;
import com.planningpoker.dominio.dto.PokerSessionUpdateDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

/**
 * Controller WebSocket para comunicação em tempo real.
 */
@Slf4j
@RequiredArgsConstructor
@Controller
public class PokerWebSocketController {

    private final ServicoPokerSession servicoPokerSession;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Notifica todos os clientes sobre atualização da sessão.
     */
    public void notificarAtualizacaoSessao(Long sessionId, String eventType) {
        try {
            var dto = servicoPokerSession.buscarPorId(sessionId, null);
            var update = new PokerSessionUpdateDTO(
                    dto.id(),
                    dto.name(),
                    dto.status(),
                    dto.votes(),
                    dto.averageVote(),
                    dto.revealedAt(),
                    eventType
            );
            
            messagingTemplate.convertAndSend("/topic/poker/session/" + sessionId, update);
            log.debug("Notificação enviada para sessão {}: {}", sessionId, eventType);
        } catch (Exception e) {
            log.error("Erro ao notificar atualização da sessão {}", sessionId, e);
        }
    }
}

