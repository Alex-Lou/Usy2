package com.memocat.feed;

import com.memocat.domain.Post;
import com.memocat.domain.User;

/**
 * Something happened in the feed (new post, comment, reaction). Published as a
 * Spring application event by the services, then broadcast to clients after the
 * transaction commits. Also the public payload on /topic/feed: it carries only
 * ids, a display name and the reaction emoji — never entities or content.
 */
public record FeedActivity(String kind, Long actorId, String actorName, Long postId, Long postAuthorId, String emoji) {

    public static final String POST = "post";
    public static final String COMMENT = "comment";
    public static final String REACTION = "reaction";

    public static FeedActivity post(User actor, Post post) {
        return new FeedActivity(POST, actor.getId(), actor.getDisplayName(), post.getId(), actor.getId(), null);
    }

    public static FeedActivity comment(User actor, Post post) {
        return new FeedActivity(COMMENT, actor.getId(), actor.getDisplayName(), post.getId(),
                post.getAuthor().getId(), null);
    }

    public static FeedActivity reaction(User actor, Post post, String emoji) {
        return new FeedActivity(REACTION, actor.getId(), actor.getDisplayName(), post.getId(),
                post.getAuthor().getId(), emoji);
    }
}
