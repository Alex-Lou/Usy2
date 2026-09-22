package com.memocat.chat;

import com.memocat.chat.dto.MessageDto;
import com.memocat.web.PageResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping
    public PageResponse<MessageDto> history(@RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "30") int size) {
        return messageService.history(page, size);
    }
}
