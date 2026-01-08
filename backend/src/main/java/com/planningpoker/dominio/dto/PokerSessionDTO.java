package com.planningpoker.dominio.dto;

import com.planningpoker.dominio.enums.SessionMode;
import com.planningpoker.dominio.enums.SessionStatus;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO para PokerSession com informações de votos.
 */
public record PokerSessionDTO(
        Long id,
        String name,
        SessionStatus status,
        SessionMode mode,
        Long storyId,
        String storyTitle,
        String inviteCode,
        List<VoteDTO> votes,
        Double averageVote,
        LocalDateTime createdAt,
        LocalDateTime revealedAt,
        String participantApelido) { // Apelido do participante atual na sessão
}
