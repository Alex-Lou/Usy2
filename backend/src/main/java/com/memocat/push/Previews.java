package com.memocat.push;

import com.memocat.domain.Message;
import com.memocat.repository.CommentRepository;
import com.memocat.repository.CoupleNoteRepository;
import com.memocat.repository.MessageExtraAttachmentRepository;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.MoodRepository;
import com.memocat.repository.PostRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The short excerpt shown under a notification (the message, the comment, the
 * note…), read back by id once the change is committed. Null when there is
 * nothing to show (deleted meanwhile, or no text).
 */
@Component
public class Previews {

    static final int MAX = 100;
    /** A sticker in a message or comment is written as [[s:its-name]] (see RichBody). */
    private static final Pattern STICKER = Pattern.compile("\\[\\[s:[a-z0-9-]+]]");
    /** One visible character: a letter, or a whole emoji (family, flag, skin tone…). */
    private static final Pattern GRAPHEME = Pattern.compile("\\X");

    private final PostRepository posts;
    private final CommentRepository comments;
    private final MessageRepository messages;
    private final CoupleNoteRepository notes;
    private final MoodRepository moods;
    private final MessageExtraAttachmentRepository extras;

    public Previews(PostRepository posts, CommentRepository comments, MessageRepository messages,
                    CoupleNoteRepository notes, MoodRepository moods, MessageExtraAttachmentRepository extras) {
        this.posts = posts;
        this.comments = comments;
        this.messages = messages;
        this.notes = notes;
        this.moods = moods;
        this.extras = extras;
    }

    @Transactional(readOnly = true)
    public String post(Long id) {
        return id == null ? null : posts.findById(id)
                .map(p -> or(shorten(p.getText()), p.getImageAsset() != null ? "📷 Photo" : null))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public String comment(Long id) {
        return id == null ? null : comments.findById(id).map(c -> or(shorten(c.getText()), c.getImageAsset() != null ? "📷 Photo" : null)).orElse(null);
    }

    @Transactional(readOnly = true)
    public String message(Long id) {
        return id == null ? null : messages.findById(id).map(m -> {
            String text = shorten(m.getContent());
            if (text != null || m.getAttachment() == null) {
                return text;
            }
            List<String> types = new ArrayList<>();
            types.add(m.getAttachment().getContentType());
            extras.findByMessageIdInOrderByMessageIdAscPositionAsc(List.of(id)).forEach(e -> types.add(e.getAsset().getContentType()));
            return types.size() == 1
                    ? attachment(m.getAttachment().getContentType(), m.getAttachment().getOriginalFilename())
                    : several(types);
        }).orElse(null);
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


    /** Several photos or files sent together: « 📷 3 photos », else « 📎 3 fichiers ». */
    static String several(List<String> contentTypes) {
        boolean photos = contentTypes.stream().allMatch(t -> t.startsWith("image/"));
        return photos ? "📷 " + contentTypes.size() + " photos" : "📎 " + contentTypes.size() + " fichiers";
    }

    /** What a message sent without words carries. */
    static String attachment(String contentType, String filename) {
        if ("image/gif".equals(contentType)) {
            return "🎞️ GIF";
        }
        if (contentType.startsWith("image/")) {
            return "📷 Photo";
        }
        if (contentType.startsWith("audio/")) {
            // Recorded in the app (stored as "vocal.…"), or a file sent from the phone: its name.
            return filename == null || filename.startsWith("vocal.") ? "🎤 Message vocal" : "🎵 " + shorten(filename);
        }
        return "📎 " + shorten(filename);
    }

    /**
     * One line, at most MAX visible characters (cut between two, never inside
     * an emoji, then "…"); a sticker reads « ✨ Sticker » rather than its code.
     */
    static String shorten(String text) {
        return shorten(text, MAX);
    }

    /** {@link #shorten(String)} with another length (the quote above a reply). */
    public static String shorten(String text, int max) {
        if (text == null) {
            return null;
        }
        String line = text.strip().replaceAll("\\s+", " ");
        if (STICKER.matcher(line).matches()) {
            return "✨ Sticker";
        }
        line = STICKER.matcher(line).replaceAll("✨");
        if (line.isEmpty()) {
            return null;
        }
        Matcher g = GRAPHEME.matcher(line);
        int count = 0;
        int cut = 0;
        while (g.find()) {
            if (++count == max) {
                cut = g.start(); // max - 1 characters kept, then "…"
            }
            if (count > max) {
                return line.substring(0, cut).stripTrailing() + "…";
            }
        }
        return line;
    }

    private static String or(String a, String b) {
        return a != null ? a : b;
    }
}
