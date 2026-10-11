package com.memocat.feed;

import com.memocat.album.AlbumService;
import com.memocat.album.PhotoService;
import com.memocat.domain.Asset;
import com.memocat.domain.Post;
import com.memocat.domain.User;
import com.memocat.feed.dto.PostDto;
import com.memocat.repository.AlbumRepository;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.PostRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ForbiddenException;
import com.memocat.web.PageResponse;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class PostService {

    private static final int MAX_TEXT = 2000;
    /** Photos in one post (a carousel). */
    static final int MAX_PHOTOS = 10;
    private static final int MAX_PAGE_SIZE = 50;

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final PostMapper postMapper;
    private final ApplicationEventPublisher events;
    private final AlbumService albumService;
    private final PhotoService photoService;
    private final AlbumRepository albumRepository;

    public PostService(PostRepository postRepository,
                       UserRepository userRepository,
                       AssetRepository assetRepository,
                       PostMapper postMapper,
                       ApplicationEventPublisher events,
                       AlbumService albumService,
                       PhotoService photoService,
                       AlbumRepository albumRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.assetRepository = assetRepository;
        this.postMapper = postMapper;
        this.events = events;
        this.albumService = albumService;
        this.photoService = photoService;
        this.albumRepository = albumRepository;
    }

    /** One post (e.g. opened from a notification); 404 when it was deleted. */
    @Transactional(readOnly = true)
    public PostDto get(String username, Long postId) {
        return postMapper.toDto(requirePost(postId), requireUser(username).getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostDto> list(String username, int page, int size) {
        Long currentUserId = requireUser(username).getId();
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        return PageResponse.of(
                postRepository.findAllByOrderByCreatedAtDesc(pageable),
                post -> postMapper.toDto(post, currentUserId));
    }

    @Transactional
    public PostDto create(String username, String text, Long imageAssetId, List<Long> imageAssetIds) {
        return create(username, text, imageAssetId, imageAssetIds, null, null);
    }

    /**
     * A post; with {@code albumId} (an existing album) or {@code newAlbumTitle} (a new one), its photos
     * also go into that album, in the same order, and the post links to it. All or nothing: one
     * transaction for the album, its photos and the post.
     */
    @Transactional
    public PostDto create(String username, String text, Long imageAssetId, List<Long> imageAssetIds,
                          Long albumId, String newAlbumTitle) {
        User author = requireUser(username);
        List<Asset> photos = resolvePhotos(requested(imageAssetId, imageAssetIds), author, List.of());
        Post draft = new Post(author, validateText(text, !photos.isEmpty()), photos);
        boolean intoAlbum = albumId != null || (newAlbumTitle != null && !newAlbumTitle.isBlank());
        if (intoAlbum) {
            if (photos.isEmpty()) {
                throw new ContentValidationException("Il faut au moins une photo pour un album");
            }
            Long target = albumId != null ? albumId : albumService.create(username, newAlbumTitle.strip(), null).id();
            for (Asset photo : photos) {
                photoService.add(username, target, photo.getId(), null);
            }
            draft.setAlbum(albumRepository.findById(target)
                    .orElseThrow(() -> new ContentValidationException("Cet album n'existe plus")));
        }
        Post post = postRepository.save(draft);
        events.publishEvent(FeedActivity.post(author, post, Mentions.in(post.getText(), userRepository.findAll(), author.getId())));
        return postMapper.toDto(post, author.getId());
    }

    @Transactional
    public PostDto update(String username, Long postId, String text, Long imageAssetId, List<Long> imageAssetIds) {
        User user = requireUser(username);
        Post post = requirePost(postId);
        requireOwner(post, user);

        List<Asset> current = post.getPhotos();
        // An app of before the carousels sends only the first photo: the others stay.
        boolean legacyKeep = imageAssetIds == null && imageAssetId != null && !current.isEmpty()
                && current.get(0).getId().equals(imageAssetId);
        List<Asset> photos = legacyKeep ? current : resolvePhotos(requested(imageAssetId, imageAssetIds), user, current);
        post.setText(validateText(text, !photos.isEmpty()));
        post.setPhotos(photos);
        post.setEdited(true);
        return postMapper.toDto(postRepository.save(post), user.getId());
    }

    @Transactional
    public void delete(String username, Long postId) {
        User user = requireUser(username);
        Post post = requirePost(postId);
        requireOwner(post, user);
        postRepository.delete(post);
    }

    private void requireOwner(Post post, User user) {
        if (!post.getAuthor().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only modify your own posts");
        }
    }

    /** Text is optional when the post carries a photo (a photo alone is a valid post). */
    private String validateText(String text, boolean hasImage) {
        if (text == null || text.isBlank()) {
            if (hasImage) {
                return "";
            }
            throw new ContentValidationException("Post text is required");
        }
        if (text.length() > MAX_TEXT) {
            throw new ContentValidationException("Post text too long (max " + MAX_TEXT + ")");
        }
        return text;
    }

    /** The photos asked for: the list, or the single one of an app of before the carousels. */
    private static List<Long> requested(Long imageAssetId, List<Long> imageAssetIds) {
        if (imageAssetIds != null) return imageAssetIds;
        return imageAssetId == null ? List.of() : List.of(imageAssetId);
    }

    /**
     * The photos, in order: images only, at most {@link #MAX_PHOTOS}, each once, sent by the author
     * (or already on the post being edited).
     */
    private List<Asset> resolvePhotos(List<Long> ids, User author, List<Asset> alreadyThere) {
        List<Long> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.size() > MAX_PHOTOS) {
            throw new ContentValidationException("Pas plus de " + MAX_PHOTOS + " photos par publication");
        }
        List<Asset> photos = new ArrayList<>(distinct.size());
        for (Long id : distinct) {
            Asset a = assetRepository.findById(id)
                    .orElseThrow(() -> new ContentValidationException("Unknown image asset"));
            if (!a.getContentType().startsWith("image/")) {
                throw new ContentValidationException("Seules des photos ou des GIFs peuvent être publiés");
            }
            boolean theirs = a.getUploader().getId().equals(author.getId())
                    || alreadyThere.stream().anyMatch(p -> p.getId().equals(id));
            if (!theirs) {
                throw new ForbiddenException("Cette photo n'est pas la tienne");
            }
            photos.add(a);
        }
        return photos;
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Post requirePost(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
    }

    private int clampSize(int size) {
        if (size <= 0) {
            return 10;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
