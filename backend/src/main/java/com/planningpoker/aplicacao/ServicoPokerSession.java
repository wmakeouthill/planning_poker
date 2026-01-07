package com.planningpoker.aplicacao;

import com.planningpoker.dominio.dto.*;
import com.planningpoker.dominio.entidade.PokerSession;
import com.planningpoker.dominio.entidade.Vote;
import com.planningpoker.dominio.enums.SessionStatus;
import com.planningpoker.dominio.exception.BusinessException;
import com.planningpoker.dominio.exception.ResourceNotFoundException;
import com.planningpoker.dominio.dto.PageResponseDTO;
import com.planningpoker.dominio.repository.PokerSessionRepository;
import com.planningpoker.dominio.repository.StoryRepository;
import com.planningpoker.dominio.repository.VoteRepository;
import com.planningpoker.interfaces.rest.v1.controller.PokerWebSocketController;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Serviço de aplicação para gerenciamento de sessões de Poker Planning.
 */
@RequiredArgsConstructor
@Service
@Slf4j
public class ServicoPokerSession {

    private final PokerSessionRepository sessionRepository;
    private final StoryRepository storyRepository;
    private final VoteRepository voteRepository;
    private final PokerWebSocketController webSocketController;

    @Transactional(readOnly = true)
    public List<PokerSession> listarAtivas() {
        log.debug("Listando sessões ativas");
        return sessionRepository.findByStatusOrderByCreatedAtDesc(SessionStatus.VOTING);
    }

    @Transactional(readOnly = true)
    public PokerSessionDTO buscarPorId(Long id, String participantName) {
        log.debug("Buscando sessão por id: {}", id);

        var session = sessionRepository.findByIdWithVotes(id)
                .orElseThrow(() -> new ResourceNotFoundException("PokerSession", id));

        return toDTO(session, participantName);
    }

    @Transactional
    public PokerSession criar(CreateSessionDTO dto) {
        log.info("Criando nova sessão de poker: {}", dto.name());

        var session = new PokerSession(dto.name());

        if (dto.storyId() != null) {
            var story = storyRepository.findById(dto.storyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Story", dto.storyId()));
            session.setStory(story);
        }

        return sessionRepository.save(session);
    }

    @Transactional
    public Vote votar(VoteRequestDTO dto) {
        log.info("Registrando voto: {} -> {}", dto.participantName(), dto.value());

        var session = sessionRepository.findById(dto.sessionId())
                .orElseThrow(() -> new ResourceNotFoundException("PokerSession", dto.sessionId()));

        if (!session.isVotingOpen()) {
            throw new BusinessException("A sessão não está aberta para votação");
        }

        // Verifica se já votou e atualiza ou cria novo voto
        Optional<Vote> existingVote = voteRepository
                .findBySessionIdAndParticipantName(dto.sessionId(), dto.participantName());

        Vote vote;
        if (existingVote.isPresent()) {
            vote = existingVote.get();
            // Se o valor for vazio, remove o voto (desmarca)
            if (dto.value() == null || dto.value().trim().isEmpty()) {
                vote.setValue(null);
                log.info("Removendo voto para: {}", dto.participantName());
            } else {
                vote.setValue(dto.value());
                log.info("Atualizando voto existente para: {}", dto.participantName());
            }
        } else {
            // Se o valor for vazio na primeira vez, cria voto vazio (participante entra na mesa)
            vote = new Vote(dto.participantName(), dto.value() != null && !dto.value().trim().isEmpty() ? dto.value() : null);
            session.addVote(vote);
            log.info("Criando voto para: {}", dto.participantName());
        }

        var savedVote = voteRepository.save(vote);
        
        // Notificar via WebSocket
        webSocketController.notificarAtualizacaoSessao(dto.sessionId(), "VOTE");
        
        return savedVote;
    }

    @Transactional
    public PokerSession revelarVotos(Long sessionId) {
        log.info("Revelando votos da sessão: {}", sessionId);

        var session = sessionRepository.findByIdWithVotes(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("PokerSession", sessionId));

        if (!session.isVotingOpen()) {
            throw new BusinessException("Os votos já foram revelados ou a sessão está fechada");
        }

        session.revealVotes();
        var savedSession = sessionRepository.save(session);
        
        // Notificar via WebSocket
        webSocketController.notificarAtualizacaoSessao(sessionId, "REVEAL");
        
        return savedSession;
    }

    @Transactional
    public PokerSession resetarVotos(Long sessionId) {
        log.info("Resetando votos da sessão: {}", sessionId);

        var session = sessionRepository.findByIdWithVotes(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("PokerSession", sessionId));

        session.resetVotes();
        voteRepository.deleteBySessionId(sessionId);
        
        var savedSession = sessionRepository.save(session);
        
        // Notificar via WebSocket
        webSocketController.notificarAtualizacaoSessao(sessionId, "RESET");
        
        return savedSession;
    }

    @Transactional
    public void fecharSessao(Long sessionId) {
        log.info("Fechando sessão: {}", sessionId);

        var session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("PokerSession", sessionId));

        session.close();
        sessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public Optional<PokerSession> buscarSessaoAtiva() {
        return sessionRepository.findFirstByStatusOrderByCreatedAtDesc(SessionStatus.VOTING);
    }

    /**
     * Lista histórico de sessões com paginação.
     */
    @Transactional(readOnly = true)
    public PageResponseDTO<PokerSessionDTO> listarHistorico(int page, int size, SessionStatus status) {
        log.debug("Listando histórico de sessões - página: {}, tamanho: {}, status: {}", page, size, status);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<PokerSession> sessionsPage;
        
        if (status != null) {
            sessionsPage = sessionRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            sessionsPage = sessionRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        
        List<PokerSessionDTO> dtos = sessionsPage.getContent().stream()
                .map(session -> toDTO(session, null))
                .toList();
        
        return PageResponseDTO.of(dtos, page, size, sessionsPage.getTotalElements());
    }

    private PokerSessionDTO toDTO(PokerSession session, String participantName) {
        var votes = session.getVotes().stream()
                .map(v -> new VoteDTO(
                        v.getId(),
                        v.getParticipantName(),
                        v.getDisplayValue(participantName),
                        v.isRevealed(),
                        v.hasVoted()))
                .toList();

        return new PokerSessionDTO(
                session.getId(),
                session.getName(),
                session.getStatus(),
                session.getStory() != null ? session.getStory().getId() : null,
                session.getStory() != null ? session.getStory().getTitle() : null,
                votes,
                session.isRevealed() ? session.calculateAverage() : null,
                session.getCreatedAt(),
                session.getRevealedAt());
    }
}
