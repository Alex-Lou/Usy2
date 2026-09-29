package com.memocat.chat;

import com.memocat.chat.dto.MessageDto;
import com.memocat.chat.dto.ReactRequest;
import com.memocat.web.PageResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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

    static final String EDITED_TOPIC = "/topic/message-edited";

    private final MessageService messageService;
    private final MessageReactionService reactionService;
    private final SimpMessagingTemplate messaging;

    public MessageController(MessageService messageService, MessageReactionService reactionService,
                             SimpMessagingTemplate messaging) {
        this.messageService = messageService;
        this.reactionService = reactionService;
        this.messaging = messaging;
    }

    public record EditRequest(String content) {
    }

    /** My own message, rewritten; both screens get the new version live. */
    @PutMapping("/{id}")
    public MessageDto edit(Principal principal, @PathVariable Long id, @RequestBody EditRequest request) {
        MessageDto edited = messageService.edit(principal.getName(), id, request.content());
        messaging.convertAndSend(EDITED_TOPIC, edited); // the change is committed by now
        return edited;
    }

    /** Messages from the other one not seen yet (the red bubble on the chat tab). */
    @GetMapping("/unread")
    public UnreadDto unread(Principal principal) {
        return new UnreadDto(messageService.unreadCount(principal.getName()));
    }

    public record UnreadDto(long count) {
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
