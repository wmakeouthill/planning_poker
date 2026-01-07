package com.planningpoker.dominio.repository;

import com.planningpoker.dominio.entidade.PokerSessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PokerSessionParticipantRepository extends JpaRepository<PokerSessionParticipant, Long> {
    boolean existsBySessionIdAndUsuarioId(Long sessionId, Long usuarioId);
}


