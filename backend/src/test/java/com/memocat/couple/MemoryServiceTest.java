package com.memocat.couple;

import com.memocat.domain.Album;
import com.memocat.domain.Asset;
import com.memocat.domain.Photo;
import com.memocat.domain.Post;
import com.memocat.domain.User;
import com.memocat.repository.PhotoRepository;
import com.memocat.repository.PostRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemoryServiceTest {

    @Mock private PostRepository posts;
    @Mock private PhotoRepository photos;

    @Test
    void usesTheCouplesDayAndSortsNewestFirst() {
        // 23:30 UTC on Sept 23 is already Sept 24 in Tokyo: memories are those of Sept 24.
        CoupleClock clock = new CoupleClock(ZoneId.of("Asia/Tokyo"),
                Clock.fixed(Instant.parse("2026-09-23T23:30:00Z"), ZoneOffset.UTC));
        User lou = new User("lou", "hash", "Lou");
        Post twoYears = new Post(lou, "Premier resto", null);
        ReflectionTestUtils.setField(twoYears, "id", 5L);
        ReflectionTestUtils.setField(twoYears, "createdAt", Instant.parse("2024-09-24T03:00:00Z"));
        Asset asset = new Asset("k", "a.jpg", "image/jpeg", 10, lou);
        ReflectionTestUtils.setField(asset, "id", 40L);
        Album album = new Album(lou, "Été", null);
        ReflectionTestUtils.setField(album, "id", 2L);
        Photo oneYear = new Photo(album, asset, lou, "Plage", 0);
        ReflectionTestUtils.setField(oneYear, "id", 11L);
        ReflectionTestUtils.setField(oneYear, "createdAt", Instant.parse("2025-09-24T08:00:00Z"));
        when(posts.findOnThisDay("Asia/Tokyo", 9, 24, 2026)).thenReturn(List.of(twoYears));
        when(photos.findOnThisDay("Asia/Tokyo", 9, 24, 2026)).thenReturn(List.of(oneYear));

        var memories = new MemoryService(posts, photos, clock).onThisDay();

        assertThat(memories).extracting(m -> m.kind() + ":" + m.yearsAgo())
                .containsExactly("photo:1", "post:2");
        assertThat(memories.get(0).albumId()).isEqualTo(2L);
        assertThat(memories.get(0).assetId()).isEqualTo(40L);
        assertThat(memories.get(1).text()).isEqualTo("Premier resto");
    }
}
