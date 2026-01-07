package com.planningpoker.aplicacao;

import com.planningpoker.dominio.entidade.Usuario;

/**
 * Abstração para obter o usuário autenticado atual.
 * Mantém a camada de aplicação desacoplada do mecanismo de segurança.
 */
public interface UsuarioAutenticadoProvider {
    Usuario getUsuarioAutenticado();
}


