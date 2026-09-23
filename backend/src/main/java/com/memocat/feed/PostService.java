package com.memocat.feed;

import com.memocat.domain.Asset;
import com.memocat.domain.Post;
import com.memocat.domain.User;
import com.memocat.feed.dto.PostDto;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.PostRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ForbiddenException;
import com.memocat.web.PageResponse;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostService {

    private static final int MAX_TEXT = 2000;
    private static final int MAX_PAGE_SIZE = 50;

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final PostMapper postMapper;

    public PostService(PostRepository postRepository,
                       UserRepository userRepository,
                       AssetRepository assetRepository,
                       PostMapper postMapper) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.assetRepository = assetRepository;
        this.postMapper = postMapper;
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
    public PostDto create(String username, String text, Long imageAssetId) {
        User author = requireUser(username);
        Asset image = resolveAsset(imageAssetId);
        Post post = new Post(author, validateText(text, image != null), image);
        return postMapper.toDto(postRepository.save(post), author.getId());
    }

    @Transactional
    public PostDto update(String username, Long postId, String text, Long imageAssetId) {
        User user = requireUser(username);
        Post post = requirePost(postId);
        requireOwner(post, user);

        Asset image = resolveAsset(imageAssetId);
        post.setText(validateText(text, image != null));
        post.setImageAsset(image);
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

    private Asset resolveAsset(Long imageAssetId) {
        if (imageAssetId == null) {
            return null;
        }
        return assetRepository.findById(imageAssetId)
                .orElseThrow(() -> new ContentValidationException("Unknown image asset"));
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
