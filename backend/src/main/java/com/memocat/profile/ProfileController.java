package com.memocat.profile;

import com.memocat.profile.dto.CompanionRequest;
import com.memocat.profile.dto.ProfileDto;
import com.memocat.profile.dto.ProfileUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public List<ProfileDto> all() {
        return profileService.getAllProfiles();
    }

    @GetMapping("/me")
    public ProfileDto myProfile(Principal principal) {
        return profileService.getMyProfile(principal.getName());
    }

    @PutMapping("/me")
    public ProfileDto updateMyProfile(Principal principal,
                                      @Valid @RequestBody ProfileUpdateRequest request) {
        return profileService.updateMyProfile(principal.getName(), request);
    }

    @PutMapping("/me/companion")
    public ProfileDto updateCompanion(Principal principal, @RequestBody CompanionRequest request) {
        return profileService.updateCompanion(principal.getName(), request.companion());
    }

    @GetMapping("/{userId}")
    public ProfileDto profile(@PathVariable Long userId) {
        return profileService.getProfileByUserId(userId);
    }
}
