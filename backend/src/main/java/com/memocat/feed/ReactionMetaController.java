package com.memocat.feed;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reactions")
public class ReactionMetaController {

    @GetMapping("/emojis")
    public List<String> allowedEmojis() {
        return ReactionEmojis.ALLOWED_ORDER;
    }
}
