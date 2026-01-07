package com.planningpoker.dominio.repository;

import com.planningpoker.dominio.entidade.Story;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository para entidade Story.
 */
@Repository
public interface StoryRepository extends JpaRepository<Story, Long> {

    List<Story> findByBoardIdOrderByCreatedAtDesc(Long boardId);

    List<Story> findByEstimatedPointsIsNull();

    @Query("""
            SELECT s FROM Story s
            WHERE s.id = :id
              AND s.board.owner.id = :ownerId
            """)
    Optional<Story> findByIdAndOwnerId(Long id, Long ownerId);
}
