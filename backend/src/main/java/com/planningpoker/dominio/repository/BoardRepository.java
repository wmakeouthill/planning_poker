package com.planningpoker.dominio.repository;

import com.planningpoker.dominio.entidade.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository para entidade Board.
 */
@Repository
public interface BoardRepository extends JpaRepository<Board, Long> {

    List<Board> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId);

    List<Board> findByOwnerIdAndTitleContainingIgnoreCase(Long ownerId, String title);

    Optional<Board> findByIdAndOwnerId(Long id, Long ownerId);
}
