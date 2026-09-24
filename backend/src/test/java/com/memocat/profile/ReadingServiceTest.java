package com.memocat.profile;

import com.memocat.domain.User;
import com.memocat.profile.dto.ReadingDto;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReadingServiceTest {

    @Mock private UserRepository users;

    @InjectMocks
    private ReadingService service;

    private final User lou = new User("lou", "hash", "Lou");

    @BeforeEach
    void setUp() {
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
    }

    @Test
    void savesAnAllowedFontAndSize() {
        assertThat(service.save("lou", new ReadingDto("nunito", "l"))).isEqualTo(new ReadingDto("nunito", "l"));
        assertThat(service.get("lou")).isEqualTo(new ReadingDto("nunito", "l"));
    }

    @Test
    void defaultsAreStoredAsNothing() {
        service.save("lou", new ReadingDto("nunito", "l"));
        assertThat(service.save("lou", new ReadingDto("app", "m"))).isEqualTo(new ReadingDto(null, null));
        assertThat(service.save("lou", new ReadingDto(null, null))).isEqualTo(new ReadingDto(null, null));
    }

    @Test
    void anythingElseIsRefusedAndNothingChanges() {
        service.save("lou", new ReadingDto("caveat", "xl"));
        assertThatThrownBy(() -> service.save("lou", new ReadingDto("Comic'; }", "m"))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.save("lou", new ReadingDto("nunito", "xxl"))).isInstanceOf(ContentValidationException.class);
        assertThat(service.get("lou")).isEqualTo(new ReadingDto("caveat", "xl"));
    }
}
