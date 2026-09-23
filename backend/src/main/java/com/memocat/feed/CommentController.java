package com.memocat.feed;

import com.memocat.feed.dto.CommentReactionsDto;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final CommentService commentService;
    private final CommentReactionService reactionService;

    public CommentController(CommentService commentService, CommentReactionService reactionService) {
        this.commentService = commentService;
        this.reactionService = reactionService;
    }

    /** Body of PUT /{id}/reaction; a null or empty emoji removes mine. */
    public record ReactRequest(String emoji) {
    }

    /** Sets, replaces or removes my emoji on a comment (see CommentReactionService). */
    @PutMapping("/{id}/reaction")
    public CommentReactionsDto react(Principal principal, @PathVariable Long id, @RequestBody ReactRequest request) {
        return reactionService.react(principal.getName(), id, request.emoji());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        commentService.delete(principal.getName(), id);
    }
}
