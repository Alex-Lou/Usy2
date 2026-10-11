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
import org.springframework.context.ApplicationEventPublisher;
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
    @Mock
    private ApplicationEventPublisher events;
    @Mock
    private com.memocat.album.AlbumService albumService;
    @Mock
    private com.memocat.album.PhotoService photoService;
    @Mock
    private com.memocat.repository.AlbumRepository albumRepository;

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
        assertThatThrownBy(() -> postService.create("lou", "   ", null, null))
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

        postService.create("lou", "  ", 5L, null);

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
                .thenReturn(new PostDto(null, null, "hi", null, null, null, null, List.of(), null, null, false, List.of(), 0, null, null));

        postService.create("lou", "hi", null, null);

        verify(postRepository).save(any(Post.class));
        verify(events).publishEvent(any(FeedActivity.class));
    }

    @Test
    void updateByNonOwnerIsForbidden() {
        User attacker = user(1L, "lou");
        User owner = user(2L, "alex");
        Post post = new Post(owner, "hers", null);
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(attacker));
        when(postRepository.findById(9L)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> postService.update("lou", 9L, "hacked", null, null))
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

    private Asset photo(long id, User uploader, String type) {
        Asset a = new Asset("k" + id, "p" + id, type, 10, uploader);
        ReflectionTestUtils.setField(a, "id", id);
        return a;
    }

    /** A carousel: the photos keep their order, the first one is also the post's image. */
    @Test
    void createKeepsSeveralPhotosInOrder() {
        User author = user(1L, "lou");
        Asset a = photo(5L, author, "image/jpeg");
        Asset b = photo(6L, author, "image/gif");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(author));
        when(assetRepository.findById(5L)).thenReturn(Optional.of(a));
        when(assetRepository.findById(6L)).thenReturn(Optional.of(b));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        postService.create("lou", "Vacances", null, List.of(6L, 5L, 6L));

        org.mockito.ArgumentCaptor<Post> saved = org.mockito.ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(saved.capture());
        assertThat(saved.getValue().getPhotos()).containsExactly(b, a);
        assertThat(saved.getValue().getImageAsset()).isSameAs(b);
    }

    @Test
    void createRejectsTooManyPhotos() {
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(user(1L, "lou")));
        List<Long> eleven = java.util.stream.LongStream.rangeClosed(1, PostService.MAX_PHOTOS + 1).boxed().toList();
        assertThatThrownBy(() -> postService.create("lou", "x", null, eleven))
                .isInstanceOf(ContentValidationException.class);
        verify(postRepository, never()).save(any());
    }

    /** Someone else's upload (a guessed id) or a document cannot be published. */
    @Test
    void createRejectsAnotherOnesPhotoOrADocument() {
        User author = user(1L, "lou");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(author));
        when(assetRepository.findById(7L)).thenReturn(Optional.of(photo(7L, user(2L, "alex"), "image/jpeg")));
        when(assetRepository.findById(8L)).thenReturn(Optional.of(photo(8L, author, "application/pdf")));

        assertThatThrownBy(() -> postService.create("lou", "x", null, List.of(7L)))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> postService.create("lou", "x", null, List.of(8L)))
                .isInstanceOf(ContentValidationException.class);
        verify(postRepository, never()).save(any());
    }

    /** An app of before the carousels edits the text and sends only the first photo: the others stay. */
    @Test
    void updateFromAnOldAppKeepsTheCarousel() {
        User author = user(1L, "lou");
        Asset a = photo(5L, author, "image/jpeg");
        Asset b = photo(6L, author, "image/jpeg");
        Post post = new Post(author, "avant", List.of(a, b));
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(author));
        when(postRepository.findById(9L)).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        postService.update("lou", 9L, "après", 5L, null);

        assertThat(post.getPhotos()).containsExactly(a, b);
        assertThat(post.getText()).isEqualTo("après");
    }

    /** « Aussi dans un album » (a new one): the album is made, gets the photos in order, the post links to it. */
    @Test
    void createPutsThePhotosInANewAlbum() {
        User author = user(1L, "lou");
        Asset a = photo(5L, author, "image/jpeg");
        Asset b = photo(6L, author, "image/jpeg");
        com.memocat.domain.Album album = org.mockito.Mockito.mock(com.memocat.domain.Album.class);
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(author));
        when(assetRepository.findById(5L)).thenReturn(Optional.of(a));
        when(assetRepository.findById(6L)).thenReturn(Optional.of(b));
        when(albumService.create("lou", "Vacances", null))
                .thenReturn(new com.memocat.album.dto.AlbumDto(12L, "Vacances", null, null, null, 0, null, null));
        when(albumRepository.findById(12L)).thenReturn(Optional.of(album));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        postService.create("lou", "", null, List.of(5L, 6L), null, "  Vacances ");

        org.mockito.InOrder order = org.mockito.Mockito.inOrder(photoService);
        order.verify(photoService).add("lou", 12L, 5L, null);
        order.verify(photoService).add("lou", 12L, 6L, null);
        org.mockito.ArgumentCaptor<Post> saved = org.mockito.ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(saved.capture());
        assertThat(saved.getValue().getAlbum()).isSameAs(album);
    }

    /** An existing album: no new one is made, the photos join it. */
    @Test
    void createAddsThePhotosToAnExistingAlbum() {
        User author = user(1L, "lou");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(author));
        when(assetRepository.findById(5L)).thenReturn(Optional.of(photo(5L, author, "image/jpeg")));
        when(albumRepository.findById(3L)).thenReturn(Optional.of(org.mockito.Mockito.mock(com.memocat.domain.Album.class)));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        postService.create("lou", "", null, List.of(5L), 3L, null);

        verify(albumService, never()).create(any(), any(), any());
        verify(photoService).add("lou", 3L, 5L, null);
    }

    @Test
    void anAlbumNeedsPhotos() {
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(user(1L, "lou")));
        assertThatThrownBy(() -> postService.create("lou", "texte", null, List.of(), null, "Vide"))
                .isInstanceOf(ContentValidationException.class);
        verify(postRepository, never()).save(any());
    }
}
