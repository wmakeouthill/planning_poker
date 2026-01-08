package com.planningpoker.dominio.repository;

import com.planningpoker.dominio.entidade.PokerSessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PokerSessionParticipantRepository extends JpaRepository<PokerSessionParticipant, Long> {
    boolean existsBySessionIdAndUsuarioId(Long sessionId, Long usuarioId);

    Optional<PokerSessionParticipant> findBySessionIdAndUsuarioId(Long sessionId, Long usuarioId);

    List<PokerSessionParticipant> findBySessionIdInAndUsuarioId(List<Long> sessionIds, Long usuarioId);

    List<PokerSessionParticipant> findBySessionId(Long sessionId);
}
