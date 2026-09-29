package com.memocat.chat;

import com.memocat.chat.dto.ChatReadDto;
import com.memocat.chat.dto.MessageDto;
import com.memocat.chat.dto.ReadRequest;
import com.memocat.chat.dto.SendMessageRequest;
import com.memocat.chat.dto.TypingDto;
import com.memocat.repository.UserRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {

    private final MessageService messageService;
    private final TypingThrottle typing;
    private final UserRepository users;

    public ChatController(MessageService messageService, TypingThrottle typing, UserRepository users) {
        this.messageService = messageService;
        this.typing = typing;
        this.users = users;
    }

    /**
     * Receives a message on /app/chat.send, persists it, then broadcasts it to
     * both subscribers of /topic/messages. Sender is taken from the authenticated
     * STOMP session, never from the payload.
     */
    @MessageMapping("/chat.send")
    @SendTo("/topic/messages")
    public MessageDto send(SendMessageRequest request, Principal principal) {
        return messageService.send(principal.getName(), request.content(), request.attachmentAssetId(),
                request.replyToId(), request.style(), request.effect());
    }

    /** /app/chat.read: the conversation is on screen up to that message ("Vu" on the other side). */
    @MessageMapping("/chat.read")
    @SendTo("/topic/chat-read")
    public ChatReadDto read(ReadRequest request, Principal principal) {
        return messageService.markRead(principal.getName(), request.upToId()); // null: nothing new, nothing sent
    }

    /** /app/chat.typing: someone is typing (never stored; at most once a second each). */
    @MessageMapping("/chat.typing")
    @SendTo("/topic/chat-typing")
    public TypingDto typing(Principal principal) {
        if (!typing.allow(principal.getName())) {
            return null;
        }
        return users.findByUsername(principal.getName())
                .map(u -> new TypingDto(u.getId(), u.getDisplayName()))
                .orElse(null);
    }
}
