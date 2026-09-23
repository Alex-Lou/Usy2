package com.memocat.chat;

import com.memocat.chat.dto.MessageDto;
import com.memocat.chat.dto.MessageReactionDto;
import com.memocat.domain.Asset;
import com.memocat.domain.Message;
import com.memocat.domain.MessageReaction;
import com.memocat.domain.User;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.MessageReactionRepository;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.PageResponse;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private static final int MAX_CONTENT = 2000;
    private static final int MAX_PAGE_SIZE = 100;

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final MessageReactionRepository reactionRepository;
    private final ApplicationEventPublisher events;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository,
                          AssetRepository assetRepository, MessageReactionRepository reactionRepository,
                          ApplicationEventPublisher events) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.assetRepository = assetRepository;
        this.reactionRepository = reactionRepository;
        this.events = events;
    }

    @Transactional
    public MessageDto send(String username, String content, Long attachmentAssetId) {
        return send(username, content, attachmentAssetId, null);
    }

    /** {@code replyToId}: the earlier message this one answers (optional, must exist). */
    @Transactional
    public MessageDto send(String username, String content, Long attachmentAssetId, Long replyToId) {
        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Asset attachment = resolveAttachment(sender, attachmentAssetId);
        Message replyTo = replyToId == null ? null : messageRepository.findById(replyToId)
                .orElseThrow(() -> new ContentValidationException("Le message cité n'existe plus"));
        Message message = messageRepository.save(
                new Message(sender, validateContent(content, attachment != null), attachment, replyTo));
        events.publishEvent(new ChatMessageSent(sender.getId(), sender.getDisplayName()));
        return MessageDto.from(message);
    }

    @Transactional(readOnly = true)
    public PageResponse<MessageDto> history(int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        Page<Message> result = messageRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<Long> ids = result.getContent().stream().map(Message::getId).toList();
        Map<Long, List<MessageReactionDto>> reactions = ids.isEmpty() ? Map.of()
                : reactionRepository.findByMessageIdInOrderByCreatedAtAsc(ids).stream().collect(Collectors.groupingBy(
                        MessageReaction::getMessageId, Collectors.mapping(MessageReactionDto::from, Collectors.toList())));
        return PageResponse.of(result, m -> MessageDto.from(m, reactions.getOrDefault(m.getId(), List.of())));
    }

    /** Only a file the sender uploaded themselves can be attached. */
    private Asset resolveAttachment(User sender, Long assetId) {
        if (assetId == null) {
            return null;
        }
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ContentValidationException("Unknown attachment"));
        if (!asset.getUploader().getId().equals(sender.getId())) {
            throw new ContentValidationException("Attachment not uploaded by the sender");
        }
        return asset;
    }

    private String validateContent(String content, boolean hasAttachment) {
        if (content == null || content.isBlank()) {
            if (hasAttachment) {
                return "";
            }
            throw new ContentValidationException("Message content is required");
        }
        if (content.length() > MAX_CONTENT) {
            throw new ContentValidationException("Message too long (max " + MAX_CONTENT + ")");
        }
        return content;
    }

    private int clampSize(int size) {
        if (size <= 0) {
            return 30;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
