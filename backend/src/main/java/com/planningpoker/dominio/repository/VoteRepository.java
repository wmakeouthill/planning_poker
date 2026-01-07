package com.planningpoker.dominio.repository;

import com.planningpoker.dominio.entidade.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository para entidade Vote.
 */
@Repository
public interface VoteRepository extends JpaRepository<Vote, Long> {

    Optional<Vote> findBySessionIdAndParticipantName(Long sessionId, String participantName);

    void deleteBySessionId(Long sessionId);
}
