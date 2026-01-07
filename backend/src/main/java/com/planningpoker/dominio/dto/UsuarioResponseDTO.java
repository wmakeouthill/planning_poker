package com.planningpoker.dominio.dto;

import com.planningpoker.dominio.entidade.Usuario;

/**
 * DTO para resposta de usuário.
 */
public record UsuarioResponseDTO(
        Long id,
        String nome,
        String email,
        String avatarUrl,
        String provider) {
    public static UsuarioResponseDTO from(Usuario usuario) {
        return new UsuarioResponseDTO(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getAvatarUrl(),
                usuario.getProvider().name());
    }
}
