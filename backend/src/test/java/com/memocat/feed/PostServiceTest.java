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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AssetRepository assetRepository;
    @Mock
    private PostMapper postMapper;

    @InjectMocks
    private PostService postService;

    private User user(long id, String username) {
        User u = new User(username, "hash", username);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    @Test
    void createRejectsBlankText() {
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(user(1L, "lou")));
        assertThatThrownBy(() -> postService.create("lou", "   ", null))
                .isInstanceOf(ContentValidationException.class);
        verify(postRepository, never()).save(any());
    }

    @Test
    void createAcceptsPhotoWithoutText() {
        User author = user(1L, "lou");
        Asset photo = new Asset("k.jpg", "p.jpg", "image/jpeg", 10, author);
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(author));
        when(assetRepository.findById(5L)).thenReturn(Optional.of(photo));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        postService.create("lou", "  ", 5L);

        org.mockito.ArgumentCaptor<Post> saved = org.mockito.ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(saved.capture());
        assertThat(saved.getValue().getText()).isEmpty();
        assertThat(saved.getValue().getImageAsset()).isSameAs(photo);
    }

    @Test
    void createPersistsValidPost() {
        User author = user(1L, "lou");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(author));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(postMapper.toDto(any(Post.class), anyLong()))
                .thenReturn(new PostDto(null, null, "hi", null, null, null, false, List.of(), 0));

        postService.create("lou", "hi", null);

        verify(postRepository).save(any(Post.class));
    }

    @Test
    void updateByNonOwnerIsForbidden() {
        User attacker = user(1L, "lou");
        User owner = user(2L, "alex");
        Post post = new Post(owner, "hers", null);
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(attacker));
        when(postRepository.findById(9L)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> postService.update("lou", 9L, "hacked", null))
                .isInstanceOf(ForbiddenException.class);
        verify(postRepository, never()).save(any());
    }

    @Test
    void deleteByNonOwnerIsForbidden() {
        User attacker = user(1L, "lou");
        User owner = user(2L, "alex");
        Post post = new Post(owner, "hers", null);
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(attacker));
        when(postRepository.findById(9L)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> postService.delete("lou", 9L))
                .isInstanceOf(ForbiddenException.class);
        verify(postRepository, never()).delete(any());
    }
}
