package com.planningpoker.dominio.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 * DTO para criação/atualização de Story.
 */
public record StoryDTO(
        Long id,

        @NotBlank(message = "Título é obrigatório") @Size(max = 200, message = "Título deve ter no máximo 200 caracteres") String title,

        String description,

        Integer estimatedPoints,

        @NotNull(message = "ID do board é obrigatório") Long boardId) {
    public StoryDTO(String title, String description, Long boardId) {
        this(null, title, description, null, boardId);
    }
}
