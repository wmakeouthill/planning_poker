package com.planningpoker.aplicacao;

import com.planningpoker.dominio.dto.*;
import com.planningpoker.dominio.entidade.PokerSessionParticipant;
import com.planningpoker.dominio.entidade.PokerSession;
import com.planningpoker.dominio.entidade.Vote;
import com.planningpoker.dominio.enums.SessionStatus;
import com.planningpoker.dominio.exception.BusinessException;
import com.planningpoker.dominio.exception.ForbiddenException;
import com.planningpoker.dominio.exception.ResourceNotFoundException;
import com.planningpoker.dominio.dto.PageResponseDTO;
import com.planningpoker.dominio.event.PokerSessionEvent;
import com.planningpoker.dominio.repository.PokerSessionParticipantRepository;
import com.planningpoker.dominio.repository.PokerSessionRepository;
import com.planningpoker.dominio.repository.StoryRepository;
import com.planningpoker.dominio.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
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
    private final PokerSessionParticipantRepository participantRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final UsuarioAutenticadoProvider usuarioAutenticadoProvider;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<PokerSession> listarAtivas() {
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.debug("Listando sessões ativas do usuário {}", usuario.getId());
        return sessionRepository.findAtivasPorUsuario(usuario.getId(), SessionStatus.VOTING);
    }

    @Transactional
    public PokerSessionDTO buscarPorId(Long id, String participantName) {
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.debug("Buscando sessão por id: {} para usuário {}", id, usuario.getId());

        var session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PokerSession", id));

        // Verificar se o usuário já é participante, se não for, criar automaticamente
        var participantOpt = participantRepository.findBySessionIdAndUsuarioId(id, usuario.getId());
        PokerSessionParticipant participant;
        if (participantOpt.isEmpty()) {
            // Criar participante automaticamente quando alguém tenta acessar a sessão
            // Se foi fornecido um participantName, usar como apelido
            participant = new PokerSessionParticipant(session, usuario, participantName);
            participant = participantRepository.save(participant);
            log.info("Participante criado automaticamente para sessão {} e usuário {} com apelido {}", 
                    id, usuario.getId(), participantName);
        } else {
            participant = participantOpt.get();
            // Se o participante já existe mas não tem apelido e foi fornecido um, atualizar
            if (participant.getApelido() == null && participantName != null && !participantName.trim().isEmpty()) {
                participant.setApelido(participantName);
                participant = participantRepository.save(participant);
                log.info("Apelido atualizado para participante da sessão {} e usuário {}: {}", 
                        id, usuario.getId(), participantName);
            }
        }

        var sessionWithVotes = sessionRepository.findByIdWithVotes(id)
                .orElseThrow(() -> new ResourceNotFoundException("PokerSession", id));

        return toDTO(sessionWithVotes, participantName, participant.getApelido());
    }

    @Transactional
    public PokerSession criar(CreateSessionDTO dto) {
        log.info("Criando nova sessão de poker: {}", dto.name());
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();

        var session = new PokerSession(dto.name());

        if (dto.storyId() != null) {
            var story = storyRepository.findByIdAndOwnerId(dto.storyId(), usuario.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Story", dto.storyId()));
            session.setStory(story);
        }

        var savedSession = sessionRepository.save(session);

        // Criador entra automaticamente como participante (controle de
        // acesso/histórico)
        if (!participantRepository.existsBySessionIdAndUsuarioId(savedSession.getId(), usuario.getId())) {
            // Usar o nome do usuário como apelido padrão
            var apelido = usuario.getNome() != null ? usuario.getNome() : null;
            participantRepository.save(new PokerSessionParticipant(savedSession, usuario, apelido));
        }

        return savedSession;
    }

    @Transactional
    public Vote votar(VoteRequestDTO dto) {
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.info("Registrando voto (userId={}): {} -> {}", usuario.getId(), dto.participantName(), dto.value());

        var session = sessionRepository.findById(dto.sessionId())
                .orElseThrow(() -> new ResourceNotFoundException("PokerSession", dto.sessionId()));

        // Verificar se o usuário já é participante, se não for, criar automaticamente
        var participantOpt = participantRepository.findBySessionIdAndUsuarioId(dto.sessionId(), usuario.getId());
        PokerSessionParticipant participant;
        if (participantOpt.isEmpty()) {
            // Criar participante automaticamente quando alguém vota pela primeira vez
            // Usar o participantName como apelido
            participant = new PokerSessionParticipant(session, usuario, dto.participantName());
            participant = participantRepository.save(participant);
            log.info("Participante criado automaticamente para sessão {} e usuário {} ao votar com apelido {}", 
                    dto.sessionId(), usuario.getId(), dto.participantName());
        } else {
            participant = participantOpt.get();
            // Se o participante já existe mas não tem apelido ou o apelido é diferente, atualizar
            if (participant.getApelido() == null || !participant.getApelido().equals(dto.participantName())) {
                participant.setApelido(dto.participantName());
                participant = participantRepository.save(participant);
                log.info("Apelido atualizado para participante da sessão {} e usuário {}: {}", 
                        dto.sessionId(), usuario.getId(), dto.participantName());
            }
        }

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
            // Se o valor for vazio na primeira vez, cria voto vazio (participante entra na
            // mesa)
            vote = new Vote(dto.participantName(),
                    dto.value() != null && !dto.value().trim().isEmpty() ? dto.value() : null);
            session.addVote(vote);
            log.info("Criando voto para: {}", dto.participantName());
        }

        var savedVote = voteRepository.save(vote);

        // Publicar evento para notificação via WebSocket
        eventPublisher.publishEvent(new PokerSessionEvent(this, dto.sessionId(), "VOTE"));

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

        // Publicar evento para notificação via WebSocket
        eventPublisher.publishEvent(new PokerSessionEvent(this, sessionId, "REVEAL"));

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

        // Publicar evento para notificação via WebSocket
        eventPublisher.publishEvent(new PokerSessionEvent(this, sessionId, "RESET"));

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
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        return sessionRepository.findPrimeiraAtivaPorUsuario(usuario.getId(), SessionStatus.VOTING);
    }

    /**
     * Lista histórico de sessões com paginação.
     */
    @Transactional(readOnly = true)
    public PageResponseDTO<PokerSessionDTO> listarHistorico(int page, int size, SessionStatus status) {
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.debug("Listando histórico de sessões - página: {}, tamanho: {}, status: {}", page, size, status);

        Pageable pageable = PageRequest.of(page, size);
        Page<PokerSession> sessionsPage;

        if (status != null) {
            sessionsPage = sessionRepository.findHistoricoPorUsuarioEStatus(usuario.getId(), status, pageable);
        } else {
            sessionsPage = sessionRepository.findHistoricoPorUsuario(usuario.getId(), pageable);
        }

        // Evitar N+1: carrega votos de uma vez e agrupa por sessão
        var sessionIds = sessionsPage.getContent().stream().map(PokerSession::getId).toList();
        final Map<Long, List<Vote>> votesBySessionId = sessionIds.isEmpty()
                ? Map.of()
                : voteRepository.findBySessionIdIn(sessionIds).stream()
                        .collect(java.util.stream.Collectors.groupingBy(v -> v.getSession().getId()));

        // Buscar apelidos dos participantes para cada sessão
        final Map<Long, String> apelidosBySessionId = sessionIds.isEmpty()
                ? Map.of()
                : participantRepository.findBySessionIdInAndUsuarioId(sessionIds, usuario.getId()).stream()
                        .collect(java.util.stream.Collectors.toMap(
                                p -> p.getSession().getId(),
                                p -> p.getApelido() != null ? p.getApelido() : null,
                                (existing, replacement) -> existing));

        List<PokerSessionDTO> dtos = sessionsPage.getContent().stream()
                .map(session -> toDTO(session, null, votesBySessionId.getOrDefault(session.getId(), List.of()), 
                        apelidosBySessionId.getOrDefault(session.getId(), null)))
                .toList();

        return PageResponseDTO.of(dtos, page, size, sessionsPage.getTotalElements());
    }

    private PokerSessionDTO toDTO(PokerSession session, String participantName) {
        return toDTO(session, participantName, session.getVotes(), null);
    }

    private PokerSessionDTO toDTO(PokerSession session, String participantName, String participantApelido) {
        return toDTO(session, participantName, session.getVotes(), participantApelido);
    }

    private PokerSessionDTO toDTO(PokerSession session, String participantName, List<Vote> votesEntity, String participantApelido) {
        var voteDtos = votesEntity.stream()
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
                session.getInviteCode(),
                voteDtos,
                session.isRevealed() ? session.calculateAverage() : null,
                session.getCreatedAt(),
                session.getRevealedAt(),
                participantApelido);
    }

    @Transactional
    public JoinSessionResponseDTO entrarPorInviteCode(String inviteCode) {
        var usuario = usuarioAutenticadoProvider.getUsuarioAutenticado();
        log.info("Entrando em sessão por inviteCode={} (userId={})", inviteCode, usuario.getId());

        var session = sessionRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PokerSession com inviteCode " + inviteCode + " não encontrado"));

        var participantOpt = participantRepository.findBySessionIdAndUsuarioId(session.getId(), usuario.getId());
        String apelido = null;
        if (participantOpt.isEmpty()) {
            // Usar o nome do usuário como apelido padrão
            apelido = usuario.getNome() != null ? usuario.getNome() : null;
            var participant = new PokerSessionParticipant(session, usuario, apelido);
            participant = participantRepository.save(participant);
            log.info("Participante criado para sessão {} e usuário {} com apelido {}", 
                    session.getId(), usuario.getId(), apelido);
        } else {
            apelido = participantOpt.get().getApelido();
        }

        return new JoinSessionResponseDTO(session.getId(), apelido);
    }

    /**
     * Envia evento de animação (emoji ou bola de papel) via WebSocket.
     */
    public void enviarAnimacao(Long sessionId, AnimationEventDTO dto) {
        // Verificar se a sessão existe
        sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("PokerSession", sessionId));

        // Propagar evento via WebSocket diretamente
        messagingTemplate.convertAndSend("/topic/poker/session/" + sessionId + "/animation", dto);
        log.debug("Evento de animação enviado para sessão {}: {} de {}", sessionId, dto.type(), dto.participantName());
    }
}
