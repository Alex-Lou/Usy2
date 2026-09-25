package com.memocat.feed;

import com.memocat.feed.dto.CommentDto;
import com.memocat.feed.dto.PostDto;
import com.memocat.feed.dto.PostRequests;
import com.memocat.web.PageResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;
    private final ReactionService reactionService;
    private final CommentService commentService;

    public PostController(PostService postService,
                          ReactionService reactionService,
                          CommentService commentService) {
        this.postService = postService;
        this.reactionService = reactionService;
        this.commentService = commentService;
    }

    @GetMapping
    public PageResponse<PostDto> list(Principal principal,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "10") int size) {
        return postService.list(principal.getName(), page, size);
    }

    @GetMapping("/{id}")
    public PostDto get(Principal principal, @PathVariable Long id) {
        return postService.get(principal.getName(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto create(Principal principal, @RequestBody PostRequests.CreatePost request) {
        return postService.create(principal.getName(), request.text(), request.imageAssetId());
    }

    @PutMapping("/{id}")
    public PostDto update(Principal principal, @PathVariable Long id,
                          @RequestBody PostRequests.UpdatePost request) {
        return postService.update(principal.getName(), id, request.text(), request.imageAssetId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        postService.delete(principal.getName(), id);
    }

    @PutMapping("/{id}/reactions")
    public PostDto react(Principal principal, @PathVariable Long id,
                         @Valid @RequestBody PostRequests.Reaction request) {
        return reactionService.react(principal.getName(), id, request.emoji());
    }

    @DeleteMapping("/{id}/reactions")
    public PostDto unreact(Principal principal, @PathVariable Long id,
                           @RequestParam String emoji) {
        return reactionService.unreact(principal.getName(), id, emoji);
    }

    @GetMapping("/{id}/comments")
    public PageResponse<CommentDto> comments(@PathVariable Long id,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return commentService.list(id, page, size);
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto addComment(Principal principal, @PathVariable Long id,
                                 @RequestBody PostRequests.CreateComment request) {
        return commentService.create(principal.getName(), id, request.text());
    }
}
