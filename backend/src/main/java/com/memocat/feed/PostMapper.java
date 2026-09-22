package com.memocat.feed;

import com.memocat.auth.dto.UserDto;
import com.memocat.domain.Post;
import com.memocat.domain.Reaction;
import com.memocat.feed.dto.PostDto;
import com.memocat.feed.dto.ReactionSummaryDto;
import com.memocat.repository.CommentRepository;
import com.memocat.repository.ReactionRepository;
import org.springframework.stereotype.Component;

import java.util.List;

/** Builds {@link PostDto} including reaction summary and comment count. */
@Component
public class PostMapper {

    private final ReactionRepository reactionRepository;
    private final CommentRepository commentRepository;

    public PostMapper(ReactionRepository reactionRepository, CommentRepository commentRepository) {
        this.reactionRepository = reactionRepository;
        this.commentRepository = commentRepository;
    }

    public PostDto toDto(Post post, Long currentUserId) {
        List<Reaction> reactions = reactionRepository.findByPostIdIn(List.of(post.getId()));
        List<ReactionSummaryDto> summaries = ReactionEmojis.ALLOWED_ORDER.stream()
                .map(emoji -> summaryFor(emoji, reactions, currentUserId))
                .filter(s -> s.count() > 0)
                .toList();

        Long imageAssetId = post.getImageAsset() != null ? post.getImageAsset().getId() : null;

        return new PostDto(
                post.getId(),
                UserDto.from(post.getAuthor()),
                post.getText(),
                imageAssetId,
                post.getCreatedAt(),
                post.getUpdatedAt(),
                post.isEdited(),
                summaries,
                commentRepository.countByPostId(post.getId()));
    }

    private ReactionSummaryDto summaryFor(String emoji, List<Reaction> reactions, Long currentUserId) {
        long count = reactions.stream().filter(r -> r.getEmoji().equals(emoji)).count();
        boolean mine = reactions.stream()
                .anyMatch(r -> r.getEmoji().equals(emoji)
                        && currentUserId != null
                        && r.getUser().getId().equals(currentUserId));
        return new ReactionSummaryDto(emoji, count, mine);
    }
}
