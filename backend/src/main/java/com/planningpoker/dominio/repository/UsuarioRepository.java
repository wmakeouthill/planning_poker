package com.planningpoker.dominio.repository;

import com.planningpoker.dominio.entidade.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository para entidade Usuario.
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    Optional<Usuario> findByProviderAndProviderId(Usuario.AuthProvider provider, String providerId);

    boolean existsByEmail(String email);
}
