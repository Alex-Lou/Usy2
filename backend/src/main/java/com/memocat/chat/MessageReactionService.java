package com.memocat.chat;

import com.memocat.chat.dto.MessageReactionDto;
import com.memocat.domain.Message;
import com.memocat.domain.MessageReaction;
import com.memocat.domain.User;
import com.memocat.feed.ReactionAdded;
import com.memocat.feed.ReactionEmojis;
import com.memocat.repository.MessageReactionRepository;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Emoji reactions on chat messages, one per person (like WhatsApp): another
 * emoji replaces mine, the same emoji again (or none) removes it.
 */
@Service
public class MessageReactionService {

    private final MessageReactionRepository reactions;
    private final MessageRepository messages;
    private final UserRepository users;
    private final ApplicationEventPublisher events;

    public MessageReactionService(MessageReactionRepository reactions, MessageRepository messages,
                                  UserRepository users, ApplicationEventPublisher events) {
        this.reactions = reactions;
        this.messages = messages;
        this.users = users;
        this.events = events;
    }

    @Transactional
    public MessageReactionsChanged react(String username, Long messageId, String emoji) {
        User user = users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Message message = messages.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
        String wanted = emoji == null || emoji.isBlank() ? null : emoji;
        if (wanted != null && !ReactionEmojis.ALLOWED.contains(wanted)) {
            throw new ContentValidationException("Réaction non autorisée");
        }

        Optional<MessageReaction> mine = reactions.findByMessageIdAndUserId(messageId, user.getId());
        boolean added = false; // a removal tells nobody
        if (wanted == null || mine.map(r -> r.getEmoji().equals(wanted)).orElse(false)) {
            mine.ifPresent(reactions::delete);
        } else if (mine.isPresent()) {
            mine.get().setEmoji(wanted);
            added = true;
        } else {
            reactions.save(new MessageReaction(messageId, user.getId(), wanted));
            added = true;
        }
        reactions.flush();

        List<MessageReactionDto> now = reactions.findByMessageIdOrderByCreatedAtAsc(messageId).stream()
                .map(MessageReactionDto::from)
                .toList();
        MessageReactionsChanged change = new MessageReactionsChanged(messageId, now);
        events.publishEvent(change);
        Long ownerId = message.getSender().getId();
        if (added && !ownerId.equals(user.getId())) {
            events.publishEvent(new ReactionAdded(ReactionAdded.MESSAGE, user.getId(), user.getDisplayName(), ownerId,
                    wanted, messageId, null));
        }
        return change;
    }
}
