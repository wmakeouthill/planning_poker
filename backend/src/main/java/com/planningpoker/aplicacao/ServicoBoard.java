package com.planningpoker.aplicacao;

import com.planningpoker.dominio.dto.BoardDTO;
import com.planningpoker.dominio.entidade.Board;
import com.planningpoker.dominio.exception.ResourceNotFoundException;
import com.planningpoker.dominio.repository.BoardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Serviço de aplicação para gerenciamento de Boards.
 */
@RequiredArgsConstructor
@Service
@Slf4j
public class ServicoBoard {

    private final BoardRepository boardRepository;

    @Transactional(readOnly = true)
    public List<Board> listarTodos() {
        log.debug("Listando todos os boards");
        return boardRepository.findAllByOrderByUpdatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Board buscarPorId(Long id) {
        log.debug("Buscando board por id: {}", id);
        return boardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Board", id));
    }

    @Transactional
    public Board criar(BoardDTO dto) {
        log.info("Criando novo board: {}", dto.title());

        var board = new Board(dto.title(), dto.description());
        board.setContent(dto.content());

        return boardRepository.save(board);
    }

    @Transactional
    public Board atualizar(Long id, BoardDTO dto) {
        log.info("Atualizando board id: {}", id);

        var board = buscarPorId(id);
        board.setTitle(dto.title());
        board.setDescription(dto.description());
        board.setContent(dto.content());

        return boardRepository.save(board);
    }

    @Transactional
    public void excluir(Long id) {
        log.info("Excluindo board id: {}", id);

        var board = buscarPorId(id);
        boardRepository.delete(board);
    }

    @Transactional(readOnly = true)
    public List<Board> pesquisar(String termo) {
        log.debug("Pesquisando boards por termo: {}", termo);
        return boardRepository.findByTitleContainingIgnoreCase(termo);
    }
}
