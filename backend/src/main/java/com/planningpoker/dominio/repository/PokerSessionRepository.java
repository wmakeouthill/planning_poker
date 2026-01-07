package com.planningpoker.dominio.repository;

import com.planningpoker.dominio.entidade.PokerSession;
import com.planningpoker.dominio.enums.SessionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository para entidade PokerSession.
 */
@Repository
public interface PokerSessionRepository extends JpaRepository<PokerSession, Long> {

    List<PokerSession> findByStatusOrderByCreatedAtDesc(SessionStatus status);

    List<PokerSession> findByStoryIdOrderByCreatedAtDesc(Long storyId);

    @Query("SELECT ps FROM PokerSession ps LEFT JOIN FETCH ps.votes WHERE ps.id = :id")
    Optional<PokerSession> findByIdWithVotes(Long id);

    Optional<PokerSession> findFirstByStatusOrderByCreatedAtDesc(SessionStatus status);

    /**
     * Lista todas as sessões ordenadas por data de criação (mais recentes primeiro).
     */
    Page<PokerSession> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Lista sessões por status com paginação.
     */
    Page<PokerSession> findByStatusOrderByCreatedAtDesc(SessionStatus status, Pageable pageable);
}
