package com.memocat.chat;

import com.memocat.chat.dto.MessageDto;
import com.memocat.chat.dto.SendMessageRequest;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {

    private final MessageService messageService;

    public ChatController(MessageService messageService) {
        this.messageService = messageService;
    }

    /**
     * Receives a message on /app/chat.send, persists it, then broadcasts it to
     * both subscribers of /topic/messages. Sender is taken from the authenticated
     * STOMP session, never from the payload.
     */
    @MessageMapping("/chat.send")
    @SendTo("/topic/messages")
    public MessageDto send(SendMessageRequest request, Principal principal) {
        return messageService.send(principal.getName(), request.content());
    }
}
