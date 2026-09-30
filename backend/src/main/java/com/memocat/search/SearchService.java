package com.memocat.search;

import com.memocat.couple.CoupleClock;
import com.memocat.domain.Album;
import com.memocat.domain.Comment;
import com.memocat.domain.CoupleNote;
import com.memocat.domain.Message;
import com.memocat.domain.Photo;
import com.memocat.domain.Post;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

/**
 * « Recherche partout »: a word in the messages, posts, comments, photo captions,
 * albums and notes, or a date (see {@link DateQuery}). At most {@link #PER_KIND}
 * results of each kind, newest first.
 */
@Service
public class SearchService {

    static final int PER_KIND = 20;
    static final int MIN_LENGTH = 2;

    private final EntityManager em;
    private final CoupleClock clock;

    public SearchService(EntityManager em, CoupleClock clock) {
        this.em = em;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<SearchHit> search(String raw) {
        String q = raw == null ? "" : raw.trim();
        if (q.length() < MIN_LENGTH) return List.of();
        Optional<DateQuery> date = DateQuery.parse(q, clock.today(), clock.zone());
        List<SearchHit> hits = new ArrayList<>();
        hits.addAll(find(Message.class, "e.content", date, q, SearchService::fromMessage));
        hits.addAll(find(Post.class, "e.text", date, q, SearchService::fromPost));
        hits.addAll(find(Comment.class, "e.text", date, q, SearchService::fromComment));
        hits.addAll(find(Photo.class, "e.caption", date, q, SearchService::fromPhoto));
        hits.addAll(find(Album.class, "concat(e.title, ' ', coalesce(e.description, ''))", date, q, SearchService::fromAlbum));
        hits.addAll(find(CoupleNote.class, "e.text", date, q, SearchService::fromNote));
        return hits;
    }

    private <T> List<SearchHit> find(Class<T> type, String textExpr, Optional<DateQuery> date, String q,
                                     Function<T, SearchHit> toHit) {
        String entity = type.getSimpleName();
        TypedQuery<T> query;
        if (date.isPresent()) {
            query = em.createQuery("select e from " + entity + " e where e.createdAt >= :from and e.createdAt < :to"
                    + " order by e.createdAt desc", type)
                    .setParameter("from", date.get().from().toInstant())
                    .setParameter("to", date.get().to().toInstant());
        } else {
            query = em.createQuery("select e from " + entity + " e where lower(" + textExpr + ") like :p escape '\\'"
                    + " order by e.createdAt desc", type)
                    .setParameter("p", likePattern(q));
        }
        return query.setMaxResults(PER_KIND).getResultList().stream().map(toHit).toList();
    }

    /** The words as typed, anywhere in the text; % and _ are plain characters. */
    static String likePattern(String q) {
        String escaped = q.toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }

    private static SearchHit fromMessage(Message m) {
        Long asset = m.getAttachment() == null ? null : m.getAttachment().getId();
        return new SearchHit("message", m.getId(), m.getContent(), m.getCreatedAt(), m.getSender().getDisplayName(),
                asset, "/chat?m=" + m.getId());
    }

    private static SearchHit fromPost(Post p) {
        Long asset = p.getImageAsset() == null ? null : p.getImageAsset().getId();
        return new SearchHit("post", p.getId(), p.getText(), p.getCreatedAt(), p.getAuthor().getDisplayName(),
                asset, "/posts/" + p.getId());
    }

    private static SearchHit fromComment(Comment c) {
        return new SearchHit("comment", c.getId(), c.getText(), c.getCreatedAt(), c.getAuthor().getDisplayName(),
                null, "/posts/" + c.getPost().getId() + "?comments=1&comment=" + c.getId());
    }

    private static SearchHit fromPhoto(Photo p) {
        return new SearchHit("photo", p.getId(), p.getCaption(), p.getCreatedAt(), p.getUploader().getDisplayName(),
                p.getAsset().getId(), "/albums/" + p.getAlbum().getId());
    }

    private static SearchHit fromAlbum(Album a) {
        return new SearchHit("album", a.getId(), a.getTitle(), a.getCreatedAt(), a.getCreator().getDisplayName(),
                null, "/albums/" + a.getId());
    }

    private static SearchHit fromNote(CoupleNote n) {
        return new SearchHit("note", n.getId(), n.getText(), n.getCreatedAt(), n.getAuthor().getDisplayName(),
                null, "/profile/nous");
    }
}
