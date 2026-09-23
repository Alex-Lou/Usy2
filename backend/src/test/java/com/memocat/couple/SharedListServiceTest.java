package com.memocat.couple;

import com.memocat.domain.SharedList;
import com.memocat.domain.SharedListItem;
import com.memocat.domain.User;
import com.memocat.repository.SharedListItemRepository;
import com.memocat.repository.SharedListRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SharedListServiceTest {

    @Mock private SharedListRepository lists;
    @Mock private SharedListItemRepository items;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher events;

    @InjectMocks
    private SharedListService service;

    private final User lou = new User("lou", "hash", "Lou");
    private SharedList groceries;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(lou, "id", 1L);
        groceries = new SharedList("Courses", lou);
        ReflectionTestUtils.setField(groceries, "id", 3L);
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(lists.findById(3L)).thenReturn(Optional.of(groceries));
        lenient().when(items.findByListIdInOrderByCreatedAtAscIdAsc(anyCollection())).thenReturn(List.of());
    }

    private CoupleActivity publishedActivity() {
        ArgumentCaptor<CoupleActivity> event = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(event.capture());
        return event.getValue();
    }

    @Test
    void addingAnItemNotifiesWithTheListName() {
        when(items.countByListId(3L)).thenReturn(0L);

        service.addItem("lou", 3L, "  Lait  ");

        ArgumentCaptor<SharedListItem> saved = ArgumentCaptor.forClass(SharedListItem.class);
        verify(items).save(saved.capture());
        assertThat(saved.getValue().getText()).isEqualTo("Lait");
        CoupleActivity a = publishedActivity();
        assertThat(a.kind()).isEqualTo(CoupleActivity.LIST);
        assertThat(a.detail()).isEqualTo("Courses");
        assertThat(a.refId()).isEqualTo(3L);
    }

    @Test
    void checkingAnItemOnlySyncs() {
        SharedListItem milk = new SharedListItem(groceries, "Lait", lou);
        when(items.findById(8L)).thenReturn(Optional.of(milk));

        service.setDone("lou", 8L, true);

        assertThat(milk.isDone()).isTrue();
        assertThat(publishedActivity().kind()).isEqualTo(CoupleActivity.LIST_CHANGE);
    }

    @Test
    void limitsAreEnforced() {
        when(lists.count()).thenReturn((long) SharedListService.MAX_LISTS);
        assertThatThrownBy(() -> service.create("lou", "Films")).isInstanceOf(ContentValidationException.class);

        when(items.countByListId(3L)).thenReturn((long) SharedListService.MAX_ITEMS);
        assertThatThrownBy(() -> service.addItem("lou", 3L, "Pain")).isInstanceOf(ContentValidationException.class);

        verify(items, never()).save(any());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void namesAndItemsMustNotBeBlankOrTooLong() {
        when(lists.count()).thenReturn(0L);
        assertThatThrownBy(() -> service.create("lou", "   ")).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.create("lou", "x".repeat(41))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.rename("lou", 3L, "")).isInstanceOf(ContentValidationException.class);
    }
}
