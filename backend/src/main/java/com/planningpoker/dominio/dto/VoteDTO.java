package com.planningpoker.dominio.dto;

/**
 * DTO para exibição de voto.
 */
public record VoteDTO(
        Long id,
        String participantName,
        String value,
        boolean revealed,
        boolean hasVoted) {
}
