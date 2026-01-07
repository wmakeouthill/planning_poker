package com.planningpoker.aplicacao;

import com.planningpoker.dominio.dto.*;
import com.planningpoker.dominio.entidade.PokerSession;
import com.planningpoker.dominio.entidade.Vote;
import com.planningpoker.dominio.enums.SessionStatus;
import com.planningpoker.dominio.exception.BusinessException;
import com.planningpoker.dominio.exception.ResourceNotFoundException;
import com.planningpoker.dominio.repository.PokerSessionRepository;
import com.planningpoker.dominio.repository.StoryRepository;
import com.planningpoker.dominio.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
            vote.setValue(dto.value());
            log.info("Atualizando voto existente para: {}", dto.participantName());
        } else {
            vote = new Vote(dto.participantName(), dto.value());
            session.addVote(vote);
        }

        return voteRepository.save(vote);
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
        return sessionRepository.save(session);
    }

    @Transactional
    public PokerSession resetarVotos(Long sessionId) {
        log.info("Resetando votos da sessão: {}", sessionId);

        var session = sessionRepository.findByIdWithVotes(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("PokerSession", sessionId));

        session.resetVotes();
        voteRepository.deleteBySessionId(sessionId);

        return sessionRepository.save(session);
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
