package com.memocat.couple;

import com.memocat.couple.dto.MemoryDto;
import com.memocat.domain.Photo;
import com.memocat.domain.Post;
import com.memocat.repository.PhotoRepository;
import com.memocat.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/** "Il y a 1 an": posts and album photos from this day in earlier years. */
@Service
public class MemoryService {

    private final PostRepository posts;
    private final PhotoRepository photos;
    private final CoupleClock clock;

    public MemoryService(PostRepository posts, PhotoRepository photos, CoupleClock clock) {
        this.posts = posts;
        this.photos = photos;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<MemoryDto> onThisDay() {
        LocalDate today = clock.today();
        String zone = clock.zone().getId();
        int month = today.getMonthValue();
        int day = today.getDayOfMonth();
        int year = today.getYear();
        Stream<MemoryDto> fromPosts = posts.findOnThisDay(zone, month, day, year).stream()
                .map(p -> fromPost(p, year));
        Stream<MemoryDto> fromPhotos = photos.findOnThisDay(zone, month, day, year).stream()
                .map(p -> fromPhoto(p, year));
        return Stream.concat(fromPosts, fromPhotos)
                .sorted(Comparator.comparing(MemoryDto::createdAt).reversed())
                .toList();
    }

    private MemoryDto fromPost(Post post, int year) {
        Long assetId = post.getImageAsset() == null ? null : post.getImageAsset().getId();
        return new MemoryDto("post", post.getId(), yearsAgo(post.getCreatedAt(), year), post.getCreatedAt(),
                post.getAuthor().getDisplayName(), post.getText(), assetId, null);
    }

    private MemoryDto fromPhoto(Photo photo, int year) {
        return new MemoryDto("photo", photo.getId(), yearsAgo(photo.getCreatedAt(), year), photo.getCreatedAt(),
                photo.getUploader().getDisplayName(), photo.getCaption(), photo.getAsset().getId(),
                photo.getAlbum().getId());
    }

    private int yearsAgo(Instant at, int year) {
        return year - at.atZone(clock.zone()).getYear();
    }
}
