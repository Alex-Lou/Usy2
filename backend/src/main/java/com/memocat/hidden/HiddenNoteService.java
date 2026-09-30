package com.memocat.hidden;

import com.memocat.couple.CoupleActivity;
import com.memocat.domain.HiddenNote;
import com.memocat.domain.User;
import com.memocat.repository.HiddenNoteRepository;
import com.memocat.repository.PhotoRepository;
import com.memocat.repository.PostRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ForbiddenException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;

/**
 * 🐾 Mot caché: a note slipped behind a photo of an album or a post. The other
 * one sees a paw when opening that photo, and the text once they tap it; the
 * author hears about it then.
 */
@Service
public class HiddenNoteService {

    static final int MAX_LENGTH = 280;

    private final HiddenNoteRepository notes;
    private final UserRepository users;
    private final PhotoRepository photos;
    private final PostRepository posts;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Autowired
    public HiddenNoteService(HiddenNoteRepository notes, UserRepository users, PhotoRepository photos,
                             PostRepository posts, ApplicationEventPublisher events) {
        this(notes, users, photos, posts, events, Clock.systemUTC());
    }

    HiddenNoteService(HiddenNoteRepository notes, UserRepository users, PhotoRepository photos,
                      PostRepository posts, ApplicationEventPublisher events, Clock clock) {
        this.notes = notes;
        this.users = users;
        this.photos = photos;
        this.posts = posts;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<HiddenNoteDto> onPhoto(String username, Long assetId) {
        User me = requireUser(username);
        return notes.findByAssetIdOrderByIdAsc(assetId).stream().map(n -> HiddenNoteDto.of(n, me.getId())).toList();
    }

    @Transactional
    public HiddenNoteDto hide(String username, Long assetId, String text) {
        User me = requireUser(username);
        String line = text == null ? "" : text.strip();
        if (line.isEmpty()) throw new ContentValidationException("Le mot est vide");
        if (line.length() > MAX_LENGTH) throw new ContentValidationException("Le mot est trop long (max " + MAX_LENGTH + ")");
        if (assetId == null || linkOf(assetId) == null) throw new ResourceNotFoundException("Photo introuvable");
        if (notes.countByAuthorIdAndAssetIdAndFoundAtIsNull(me.getId(), assetId) > 0) {
            throw new ConflictException("Un de tes mots attend déjà derrière cette photo");
        }
        HiddenNote saved = notes.save(new HiddenNote(me, assetId, line, clock.instant()));
        return HiddenNoteDto.of(saved, me.getId());
    }

    /** The other one taps the paw: the text shows, and the author hears about it (first time only). */
    @Transactional
    public HiddenNoteDto find(String username, Long id) {
        User me = requireUser(username);
        HiddenNote note = notes.findById(id).orElseThrow(() -> new ResourceNotFoundException("Mot introuvable"));
        if (note.getAuthor().getId().equals(me.getId())) throw new ForbiddenException("C'est ton propre mot");
        if (note.find(clock.instant())) {
            events.publishEvent(CoupleActivity.of(CoupleActivity.HIDDEN_FOUND, me, linkOf(note.getAssetId()), note.getId()));
        }
        return HiddenNoteDto.of(note, me.getId());
    }

    @Transactional
    public void delete(String username, Long id) {
        User me = requireUser(username);
        HiddenNote note = notes.findById(id).orElseThrow(() -> new ResourceNotFoundException("Mot introuvable"));
        if (!note.getAuthor().getId().equals(me.getId())) throw new ForbiddenException("Seul son auteur peut le retirer");
        notes.delete(note);
    }

    /** Where the photo lives in the app, or null if it is neither in an album nor in a post. */
    String linkOf(Long assetId) {
        return photos.findFirstByAssetId(assetId)
                .map(p -> "/albums/" + p.getAlbum().getId())
                .orElseGet(() -> posts.findFirstByImageAssetId(assetId).map(p -> "/posts/" + p.getId()).orElse(null));
    }

    private User requireUser(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
