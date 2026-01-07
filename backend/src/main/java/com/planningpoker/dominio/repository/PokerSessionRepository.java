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

    Optional<PokerSession> findByInviteCode(String inviteCode);

    /**
     * Lista todas as sessões ordenadas por data de criação (mais recentes primeiro).
     */
    Page<PokerSession> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Lista sessões por status com paginação.
     */
    Page<PokerSession> findByStatusOrderByCreatedAtDesc(SessionStatus status, Pageable pageable);

    @Query("""
            SELECT ps FROM PokerSession ps
            WHERE ps.status = :status
              AND ps.id IN (
                SELECT sp.session.id FROM PokerSessionParticipant sp
                WHERE sp.usuario.id = :usuarioId
              )
            ORDER BY ps.createdAt DESC
            """)
    List<PokerSession> findAtivasPorUsuario(Long usuarioId, SessionStatus status);

    @Query("""
            SELECT ps FROM PokerSession ps
            WHERE ps.status = :status
              AND ps.id IN (
                SELECT sp.session.id FROM PokerSessionParticipant sp
                WHERE sp.usuario.id = :usuarioId
              )
            ORDER BY ps.createdAt DESC
            """)
    Optional<PokerSession> findPrimeiraAtivaPorUsuario(Long usuarioId, SessionStatus status);

    @Query("""
            SELECT ps FROM PokerSession ps
            WHERE ps.id IN (
                SELECT sp.session.id FROM PokerSessionParticipant sp
                WHERE sp.usuario.id = :usuarioId
            )
            ORDER BY ps.createdAt DESC
            """)
    Page<PokerSession> findHistoricoPorUsuario(Long usuarioId, Pageable pageable);

    @Query("""
            SELECT ps FROM PokerSession ps
            WHERE ps.status = :status
              AND ps.id IN (
                SELECT sp.session.id FROM PokerSessionParticipant sp
                WHERE sp.usuario.id = :usuarioId
              )
            ORDER BY ps.createdAt DESC
            """)
    Page<PokerSession> findHistoricoPorUsuarioEStatus(Long usuarioId, SessionStatus status, Pageable pageable);
}
