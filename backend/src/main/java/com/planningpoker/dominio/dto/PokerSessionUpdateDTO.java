package com.planningpoker.dominio.dto;

import com.planningpoker.dominio.enums.SessionStatus;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO para atualizações de sessão via WebSocket.
 */
public record PokerSessionUpdateDTO(
                Long id,
                String name,
                SessionStatus status,
                List<VoteDTO> votes,
                Double averageVote,
                LocalDateTime revealedAt,
                String eventType, // "VOTE", "REVEAL", "RESET", "JOIN", "CLOSED"
                Long novaSessaoId // ID da nova sessão (quando nova rodada é criada)
) {
}
