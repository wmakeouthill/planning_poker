package com.planningpoker.infraestrutura.security;

import com.planningpoker.aplicacao.UsuarioAutenticadoProvider;
import com.planningpoker.dominio.entidade.Usuario;
import com.planningpoker.dominio.exception.ForbiddenException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Implementação baseada no Spring Security para obter o usuário autenticado.
 */
@Component
public class SecurityUsuarioAutenticadoProvider implements UsuarioAutenticadoProvider {

    @Override
    public Usuario getUsuarioAutenticado() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Usuario usuario)) {
            throw new ForbiddenException("Usuário não autenticado");
        }
        return usuario;
    }
}


