package com.memocat.chat;

import com.memocat.chat.dto.MessageDto;

/** A « je pense à toi » was added to the conversation (see MessageService#sendThought). */
public record ThoughtSent(MessageDto message) {
}
