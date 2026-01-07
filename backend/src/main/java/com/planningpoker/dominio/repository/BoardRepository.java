package com.planningpoker.dominio.repository;

import com.planningpoker.dominio.entidade.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository para entidade Board.
 */
@Repository
public interface BoardRepository extends JpaRepository<Board, Long> {

    List<Board> findAllByOrderByUpdatedAtDesc();

    List<Board> findByTitleContainingIgnoreCase(String title);
}
