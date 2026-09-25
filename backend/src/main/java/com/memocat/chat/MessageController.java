package com.memocat.chat;

import com.memocat.chat.dto.MessageDto;
import com.memocat.chat.dto.ReactRequest;
import com.memocat.web.PageResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;
    private final MessageReactionService reactionService;

    public MessageController(MessageService messageService, MessageReactionService reactionService) {
        this.messageService = messageService;
        this.reactionService = reactionService;
    }

    @GetMapping
    public PageResponse<MessageDto> history(@RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "30") int size) {
        return messageService.history(page, size);
    }

    /** Sets, replaces or removes my emoji on a message (see MessageReactionService). */
    @PutMapping("/{id}/reaction")
    public MessageReactionsChanged react(Principal principal, @PathVariable Long id, @RequestBody ReactRequest request) {
        return reactionService.react(principal.getName(), id, request.emoji());
    }
}
