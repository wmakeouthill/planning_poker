package com.planningpoker.dominio.repository;

import com.planningpoker.dominio.entidade.Story;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository para entidade Story.
 */
@Repository
public interface StoryRepository extends JpaRepository<Story, Long> {

    List<Story> findByBoardIdOrderByCreatedAtDesc(Long boardId);

    List<Story> findByEstimatedPointsIsNull();
}
