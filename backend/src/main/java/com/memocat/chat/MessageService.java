package com.memocat.chat;

import com.memocat.chat.dto.MessageDto;
import com.memocat.domain.Asset;
import com.memocat.domain.Message;
import com.memocat.domain.User;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.PageResponse;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessageService {

    private static final int MAX_CONTENT = 2000;
    private static final int MAX_PAGE_SIZE = 100;

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final ApplicationEventPublisher events;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository,
                          AssetRepository assetRepository, ApplicationEventPublisher events) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.assetRepository = assetRepository;
        this.events = events;
    }

    @Transactional
    public MessageDto send(String username, String content, Long attachmentAssetId) {
        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Asset attachment = resolveAttachment(sender, attachmentAssetId);
        Message message = messageRepository.save(
                new Message(sender, validateContent(content, attachment != null), attachment));
        events.publishEvent(new ChatMessageSent(sender.getId(), sender.getDisplayName()));
        return MessageDto.from(message);
    }

    @Transactional(readOnly = true)
    public PageResponse<MessageDto> history(int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        return PageResponse.of(messageRepository.findAllByOrderByCreatedAtDesc(pageable), MessageDto::from);
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
