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
    private final UsuarioAutenticadoProvider usuarioAutenticadoProvider;

    @Transactional(readOnly = true)
    public List<Board> listarTodos() {
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.debug("Listando boards do usuário {}", usuario.getId());
        return boardRepository.findByOwnerIdOrderByUpdatedAtDesc(usuario.getId());
    }

    @Transactional(readOnly = true)
    public Board buscarPorId(Long id) {
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.debug("Buscando board por id: {} (userId={})", id, usuario.getId());
        return boardRepository.findByIdAndOwnerId(id, usuario.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Board", id));
    }

    @Transactional
    public Board criar(BoardDTO dto) {
        log.info("Criando novo board: {}", dto.title());
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();

        var board = new Board(dto.title(), dto.description());
        board.setContent(dto.content());
        board.setOwner(usuario);

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
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.debug("Pesquisando boards por termo: {} (userId={})", termo, usuario.getId());
        return boardRepository.findByOwnerIdAndTitleContainingIgnoreCase(usuario.getId(), termo);
    }
}
