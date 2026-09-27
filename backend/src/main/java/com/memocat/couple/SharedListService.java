package com.memocat.couple;

import com.memocat.couple.dto.SharedListDto;
import com.memocat.couple.dto.SharedListDto.ListItemDto;
import com.memocat.domain.SharedList;
import com.memocat.domain.SharedListItem;
import com.memocat.domain.User;
import com.memocat.repository.SharedListItemRepository;
import com.memocat.repository.SharedListRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Named lists both people edit. Everything is shared, so either person may
 * change or delete any list or item. Each change returns the whole list so the
 * client simply replaces it.
 */
@Service
public class SharedListService {

    static final int MAX_LISTS = 20;
    static final int MAX_ITEMS = 200;
    static final int MAX_NAME = 40;
    static final int MAX_ITEM = 120;

    private final SharedListRepository lists;
    private final SharedListItemRepository items;
    private final UserRepository users;
    private final ApplicationEventPublisher events;

    public SharedListService(SharedListRepository lists, SharedListItemRepository items, UserRepository users,
                             ApplicationEventPublisher events) {
        this.lists = lists;
        this.items = items;
        this.users = users;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<SharedListDto> all() {
        List<SharedList> all = lists.findAllByOrderByCreatedAtAscIdAsc();
        Map<Long, List<ListItemDto>> byList = all.isEmpty() ? Map.of()
                : items.findByListIdInOrderByCreatedAtAscIdAsc(all.stream().map(SharedList::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(i -> i.getList().getId(),
                        Collectors.mapping(SharedListService::toItemDto, Collectors.toList())));
        return all.stream()
                .map(l -> toDto(l, byList.getOrDefault(l.getId(), List.of())))
                .toList();
    }

    @Transactional
    public SharedListDto create(String username, String name) {
        User me = requireUser(username);
        if (lists.count() >= MAX_LISTS) {
            throw new ContentValidationException("Trop de listes (max " + MAX_LISTS + ")");
        }
        SharedList list = lists.save(new SharedList(Texts.required(name, MAX_NAME, "Le nom"), me));
        events.publishEvent(CoupleActivity.of(CoupleActivity.LIST, me, list.getName(), list.getId()));
        return toDto(list, List.of());
    }

    @Transactional
    public SharedListDto rename(String username, Long listId, String name) {
        User me = requireUser(username);
        SharedList list = requireList(listId);
        list.setName(Texts.required(name, MAX_NAME, "Le nom"));
        return changed(me, list);
    }

    @Transactional
    public void delete(String username, Long listId) {
        User me = requireUser(username);
        SharedList list = requireList(listId);
        lists.delete(list); // items go with it (on delete cascade)
        events.publishEvent(CoupleActivity.of(CoupleActivity.LIST_CHANGE, me, list.getName(), listId));
    }

    @Transactional
    public SharedListDto addItem(String username, Long listId, String text) {
        User me = requireUser(username);
        SharedList list = requireList(listId);
        if (items.countByListId(listId) >= MAX_ITEMS) {
            throw new ContentValidationException("Liste pleine (max " + MAX_ITEMS + ")");
        }
        items.save(new SharedListItem(list, Texts.required(text, MAX_ITEM, "L'élément"), me));
        events.publishEvent(CoupleActivity.of(CoupleActivity.LIST, me, list.getName(), list.getId()));
        return reload(list);
    }

    @Transactional
    public SharedListDto setDone(String username, Long itemId, boolean done) {
        User me = requireUser(username);
        SharedListItem item = requireItem(itemId);
        item.setDone(done);
        return changed(me, item.getList());
    }

    @Transactional
    public SharedListDto deleteItem(String username, Long itemId) {
        User me = requireUser(username);
        SharedListItem item = requireItem(itemId);
        items.delete(item);
        return changed(me, item.getList());
    }

    @Transactional
    public SharedListDto clearDone(String username, Long listId) {
        User me = requireUser(username);
        SharedList list = requireList(listId);
        items.deleteDoneByListId(listId);
        return changed(me, list);
    }

    private SharedListDto changed(User me, SharedList list) {
        events.publishEvent(CoupleActivity.of(CoupleActivity.LIST_CHANGE, me, list.getName(), list.getId()));
        return reload(list);
    }

    private SharedListDto reload(SharedList list) {
        items.flush();
        List<ListItemDto> itemDtos = items.findByListIdInOrderByCreatedAtAscIdAsc(List.of(list.getId())).stream()
                .map(SharedListService::toItemDto)
                .toList();
        return toDto(list, itemDtos);
    }

    private static SharedListDto toDto(SharedList list, List<ListItemDto> itemDtos) {
        return new SharedListDto(list.getId(), list.getName(), list.getCreatedAt(), itemDtos);
    }

    private static ListItemDto toItemDto(SharedListItem item) {
        return new ListItemDto(item.getId(), item.getText(), item.isDone(), item.getCreatedBy().getId(),
                item.getCreatedAt());
    }

    private SharedList requireList(Long id) {
        return lists.findById(id).orElseThrow(() -> new ResourceNotFoundException("List not found"));
    }

    private SharedListItem requireItem(Long id) {
        return items.findById(id).orElseThrow(() -> new ResourceNotFoundException("Item not found"));
    }

    private User requireUser(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
