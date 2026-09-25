package com.memocat.profile.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * My own "Actus" tab (only for me, on every device): the news sites I turned
 * on ({@code sources}, ids from NewsCatalog) and the public accounts I follow
 * ({@code follows}). Nothing is on until I choose it.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record NewsPrefsDto(List<String> sources, List<Follow> follows) {

    /**
     * A public account or post, readable without any sign-in: {@code kind} is
     * "bluesky" (handle), "mastodon" (user@instance), "reddit" (subreddit) or
     * "xpost" (the link of one post on X, read through FxTwitter).
     */
    public record Follow(String kind, String handle) {
    }
}
