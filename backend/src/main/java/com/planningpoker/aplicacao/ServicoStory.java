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
    private final UsuarioAutenticadoProvider usuarioAutenticadoProvider;

    @Transactional(readOnly = true)
    public List<Story> listarPorBoard(Long boardId) {
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.debug("Listando stories do board: {} (userId={})", boardId, usuario.getId());

        // Garante que o board pertence ao usuário autenticado
        boardRepository.findByIdAndOwnerId(boardId, usuario.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Board", boardId));

        return storyRepository.findByBoardIdOrderByCreatedAtDesc(boardId);
    }

    @Transactional(readOnly = true)
    public Story buscarPorId(Long id) {
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.debug("Buscando story por id: {} (userId={})", id, usuario.getId());
        return storyRepository.findByIdAndOwnerId(id, usuario.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Story", id));
    }

    @Transactional
    public Story criar(StoryDTO dto) {
        log.info("Criando nova story: {}", dto.title());
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();

        var board = boardRepository.findByIdAndOwnerId(dto.boardId(), usuario.getId())
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
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.debug("Listando stories não estimadas (userId={})", usuario.getId());

        // Filtra manualmente: só stories dos boards do usuário
        return storyRepository.findByEstimatedPointsIsNull().stream()
                .filter(s -> s.getBoard() != null && s.getBoard().getOwner() != null
                        && usuario.getId().equals(s.getBoard().getOwner().getId()))
                .toList();
    }
}
