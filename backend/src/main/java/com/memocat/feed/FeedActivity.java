package com.memocat.feed;

import com.memocat.domain.Comment;
import com.memocat.domain.Post;
import com.memocat.domain.User;

import java.util.List;

/**
 * Something happened in the feed (new post, comment, reaction). Published as a
 * Spring application event by the services, then broadcast to clients after the
 * transaction commits. Also the public payload on /topic/feed: it carries only
 * ids, a display name and the reaction emoji — never entities or content.
 * {@code mentionedIds}: who the post or comment tags; {@code commentId}: the new
 * comment; {@code replyToId}: the author of the comment it answers.
 */
public record FeedActivity(String kind, Long actorId, String actorName, Long postId, Long postAuthorId, String emoji,
                           List<Long> mentionedIds, Long commentId, Long replyToId) {

    public static final String POST = "post";
    public static final String COMMENT = "comment";
    public static final String REACTION = "reaction";

    public FeedActivity(String kind, Long actorId, String actorName, Long postId, Long postAuthorId, String emoji) {
        this(kind, actorId, actorName, postId, postAuthorId, emoji, List.of(), null, null);
    }

    public static FeedActivity post(User actor, Post post, List<Long> mentioned) {
        return new FeedActivity(POST, actor.getId(), actor.getDisplayName(), post.getId(), actor.getId(), null,
                mentioned, null, null);
    }

    public static FeedActivity comment(User actor, Post post, Comment comment, List<Long> mentioned) {
        Comment parent = comment.getParent();
        return new FeedActivity(COMMENT, actor.getId(), actor.getDisplayName(), post.getId(),
                post.getAuthor().getId(), null, mentioned, comment.getId(),
                parent == null ? null : parent.getAuthor().getId());
    }

    public static FeedActivity reaction(User actor, Post post, String emoji) {
        return new FeedActivity(REACTION, actor.getId(), actor.getDisplayName(), post.getId(),
                post.getAuthor().getId(), emoji);
    }
}
