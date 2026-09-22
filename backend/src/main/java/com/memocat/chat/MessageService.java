package com.memocat.chat;

import com.memocat.chat.dto.MessageDto;
import com.memocat.domain.Message;
import com.memocat.domain.User;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.PageResponse;
import com.memocat.web.ResourceNotFoundException;
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

    public MessageService(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public MessageDto send(String username, String content) {
        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Message message = new Message(sender, validateContent(content));
        return MessageDto.from(messageRepository.save(message));
    }

    @Transactional(readOnly = true)
    public PageResponse<MessageDto> history(int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        return PageResponse.of(messageRepository.findAllByOrderByCreatedAtDesc(pageable), MessageDto::from);
    }

    private String validateContent(String content) {
        if (content == null || content.isBlank()) {
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
