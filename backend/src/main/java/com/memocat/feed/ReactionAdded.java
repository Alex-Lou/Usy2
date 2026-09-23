package com.memocat.feed;

/**
 * Someone put (or changed) an emoji on the other person's chat message or
 * comment. Tells the owner: live on /topic/reactions (the in-app bell, see
 * ReactionAddedBroadcaster) and as a push notification (PushNotifier).
 * Removing a reaction or reacting to one's own content publishes nothing.
 * {@code refId} is the message or comment id; {@code postId} is set for a comment.
 */
public record ReactionAdded(String target, Long actorId, String actorName, Long ownerId, String emoji,
                            Long refId, Long postId) {

    public static final String MESSAGE = "message";
    public static final String COMMENT = "comment";
}
