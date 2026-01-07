package com.planningpoker.dominio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO para criação/atualização de Board.
 */
public record BoardDTO(
        Long id,

        @NotBlank(message = "Título é obrigatório") @Size(max = 200, message = "Título deve ter no máximo 200 caracteres") String title,

        @Size(max = 500, message = "Descrição deve ter no máximo 500 caracteres") String description,

        String content) {
    public BoardDTO(String title, String description) {
        this(null, title, description, null);
    }
}
