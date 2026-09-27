package com.memocat.feed;

import com.memocat.domain.Comment;
import com.memocat.domain.CommentReaction;
import com.memocat.domain.User;
import com.memocat.feed.dto.CommentReactionDto;
import com.memocat.feed.dto.CommentReactionsDto;
import com.memocat.repository.CommentReactionRepository;
import com.memocat.repository.CommentRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Emoji reactions on post comments, one per person (same rule as chat
 * messages): another emoji replaces mine, the same emoji again (or none) removes it.
 */
@Service
public class CommentReactionService {

    private final CommentReactionRepository reactions;
    private final CommentRepository comments;
    private final UserRepository users;
    private final ApplicationEventPublisher events;

    public CommentReactionService(CommentReactionRepository reactions, CommentRepository comments, UserRepository users,
                                  ApplicationEventPublisher events) {
        this.reactions = reactions;
        this.comments = comments;
        this.users = users;
        this.events = events;
    }

    @Transactional
    public CommentReactionsDto react(String username, Long commentId, String emoji) {
        User user = users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Comment comment = comments.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        String wanted = emoji == null || emoji.isBlank() ? null : emoji;
        if (wanted != null && !ReactionEmojis.ALLOWED.contains(wanted)) {
            throw new ContentValidationException("Réaction non autorisée");
        }

        Optional<CommentReaction> mine = reactions.findByCommentIdAndUserId(commentId, user.getId());
        boolean added = false; // a removal tells nobody
        if (wanted == null || mine.map(r -> r.getEmoji().equals(wanted)).orElse(false)) {
            mine.ifPresent(reactions::delete);
        } else if (mine.isPresent()) {
            mine.get().setEmoji(wanted);
            added = true;
        } else {
            reactions.save(new CommentReaction(commentId, user.getId(), wanted));
            added = true;
        }
        reactions.flush();
        CommentReactionsDto change = new CommentReactionsDto(commentId,
                reactions.findByCommentIdOrderByCreatedAtAsc(commentId).stream().map(CommentReactionDto::from).toList());
        events.publishEvent(change); // live on the other screen, see CommentReactionBroadcaster
        Long ownerId = comment.getAuthor().getId();
        if (added && !ownerId.equals(user.getId())) {
            events.publishEvent(new ReactionAdded(ReactionAdded.COMMENT, user.getId(), user.getDisplayName(), ownerId,
                    wanted, commentId, comment.getPost().getId()));
        }
        return change;
    }
}
