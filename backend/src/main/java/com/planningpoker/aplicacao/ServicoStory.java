package com.planningpoker.aplicacao;

import com.planningpoker.dominio.dto.StoryDTO;
import com.planningpoker.dominio.entidade.Story;
import com.planningpoker.dominio.exception.ResourceNotFoundException;
import com.planningpoker.dominio.repository.BoardRepository;
import com.planningpoker.dominio.repository.StoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Serviço de aplicação para gerenciamento de Stories.
 */
@RequiredArgsConstructor
@Service
@Slf4j
public class ServicoStory {

    private final StoryRepository storyRepository;
    private final BoardRepository boardRepository;

    @Transactional(readOnly = true)
    public List<Story> listarPorBoard(Long boardId) {
        log.debug("Listando stories do board: {}", boardId);
        return storyRepository.findByBoardIdOrderByCreatedAtDesc(boardId);
    }

    @Transactional(readOnly = true)
    public Story buscarPorId(Long id) {
        log.debug("Buscando story por id: {}", id);
        return storyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Story", id));
    }

    @Transactional
    public Story criar(StoryDTO dto) {
        log.info("Criando nova story: {}", dto.title());

        var board = boardRepository.findById(dto.boardId())
                .orElseThrow(() -> new ResourceNotFoundException("Board", dto.boardId()));

        var story = new Story(dto.title(), dto.description());
        story.setBoard(board);

        return storyRepository.save(story);
    }

    @Transactional
    public Story atualizar(Long id, StoryDTO dto) {
        log.info("Atualizando story id: {}", id);

        var story = buscarPorId(id);
        story.setTitle(dto.title());
        story.setDescription(dto.description());
        story.setEstimatedPoints(dto.estimatedPoints());

        return storyRepository.save(story);
    }

    @Transactional
    public void excluir(Long id) {
        log.info("Excluindo story id: {}", id);

        var story = buscarPorId(id);
        storyRepository.delete(story);
    }

    @Transactional(readOnly = true)
    public List<Story> listarNaoEstimadas() {
        log.debug("Listando stories não estimadas");
        return storyRepository.findByEstimatedPointsIsNull();
    }
}
