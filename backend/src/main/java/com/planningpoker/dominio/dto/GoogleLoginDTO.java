package com.planningpoker.dominio.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO para login com Google.
 */
public record GoogleLoginDTO(
        @NotBlank(message = "Token do Google é obrigatório") String idToken) {
}
