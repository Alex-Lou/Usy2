package com.memocat.push;

import com.memocat.domain.Asset;
import com.memocat.domain.Message;
import com.memocat.repository.CommentRepository;
import com.memocat.repository.CoupleNoteRepository;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.MoodRepository;
import com.memocat.repository.PostRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The short excerpt shown under a notification (the message, the comment, the
 * note…), read back by id once the change is committed. Null when there is
 * nothing to show (deleted meanwhile, or no text).
 */
@Component
public class Previews {

    static final int MAX = 100;

    private final PostRepository posts;
    private final CommentRepository comments;
    private final MessageRepository messages;
    private final CoupleNoteRepository notes;
    private final MoodRepository moods;

    public Previews(PostRepository posts, CommentRepository comments, MessageRepository messages,
                    CoupleNoteRepository notes, MoodRepository moods) {
        this.posts = posts;
        this.comments = comments;
        this.messages = messages;
        this.notes = notes;
        this.moods = moods;
    }

    @Transactional(readOnly = true)
    public String post(Long id) {
        return id == null ? null : posts.findById(id)
                .map(p -> or(shorten(p.getText()), p.getImageAsset() != null ? "📷 Photo" : null))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public String comment(Long id) {
        return id == null ? null : comments.findById(id).map(c -> shorten(c.getText())).orElse(null);
    }

    @Transactional(readOnly = true)
    public String message(Long id) {
        return id == null ? null : messages.findById(id).map(Previews::message).orElse(null);
    }

    @Transactional(readOnly = true)
    public String note(Long id) {
        return id == null ? null : notes.findById(id).map(n -> shorten(n.getText())).orElse(null);
    }

    /** The few words that go with someone's mood emoji. */
    @Transactional(readOnly = true)
    public String moodLabel(Long userId) {
        return userId == null ? null : moods.findById(userId).map(m -> shorten(m.getLabel())).orElse(null);
    }

    private static String message(Message m) {
        String text = shorten(m.getContent());
        Asset a = m.getAttachment();
        if (text != null || a == null) {
            return text;
        }
        String type = a.getContentType();
        if (type.startsWith("image/")) {
            return "📷 Photo";
        }
        return type.startsWith("audio/") ? "🎤 Message vocal" : "📎 " + shorten(a.getOriginalFilename());
    }

    /** One line, at most MAX characters (cut on a whole character, then "…"). */
    static String shorten(String text) {
        if (text == null) {
            return null;
        }
        String line = text.strip().replaceAll("\\s+", " ");
        if (line.isEmpty()) {
            return null;
        }
        if (line.codePointCount(0, line.length()) <= MAX) {
            return line;
        }
        return line.substring(0, line.offsetByCodePoints(0, MAX - 1)).stripTrailing() + "…";
    }

    private static String or(String a, String b) {
        return a != null ? a : b;
    }
}
