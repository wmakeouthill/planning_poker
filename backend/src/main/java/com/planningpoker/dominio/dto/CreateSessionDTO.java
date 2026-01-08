package com.planningpoker.dominio.dto;

import com.planningpoker.dominio.enums.SessionMode;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO para criar uma nova sessão de poker.
 */
public record CreateSessionDTO(
        String name,
        Long storyId,
        SessionMode mode) {
}
