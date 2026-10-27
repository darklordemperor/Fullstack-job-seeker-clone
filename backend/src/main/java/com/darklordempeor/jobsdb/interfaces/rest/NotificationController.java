package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.notification.NotificationUseCase;
import com.darklordempeor.jobsdb.application.model.NotificationModels.UnreadCount;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.domain.model.Notification;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@Tag(name="Notifications", description="Private in-app inbox for the authenticated account. No email delivery.")
@io.swagger.v3.oas.annotations.security.SecurityRequirement(name="bearer-jwt")
@io.swagger.v3.oas.annotations.responses.ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="200",description="ApiResponse with the authenticated account's data"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="400",description="Invalid UUID, boolean or integer query value"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="401",description="Authentication required"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="404",description="Notification missing or belongs to another account")
})
public class NotificationController {
    private final NotificationUseCase useCase;
    public NotificationController(NotificationUseCase useCase) { this.useCase=useCase; }
    @GetMapping
    @Operation(summary="List my notifications", description="Newest first, stable UUID tie-breaker. page is zero-based and clamped to 0; size defaults to 20 and is clamped to 1..50. unreadOnly defaults to false. Returns content,totalElements,totalPages,page; each item has id,kind,title,message,href,createdAt,readAt (null when unread). Recipient IDs, event keys, actors and internal notes are excluded. Reading the list does not mark items read.")
    public ApiResponse<Page<Notification>> list(Principal user, @RequestParam(defaultValue="false") boolean unreadOnly,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return ApiResponse.success(useCase.list(UUID.fromString(user.getName()),unreadOnly,page,size),"Notifications loaded");
    }
    @GetMapping("/unread-count")
    @Operation(summary="Count my unread notifications",description="Returns {unreadCount: number}. No recipient selector is accepted.")
    public ApiResponse<UnreadCount> count(Principal user) { return ApiResponse.success(useCase.unreadCount(UUID.fromString(user.getName())),"Unread count loaded"); }
    @PatchMapping("/{id}/read")
    @Operation(summary="Mark my notification read",description="No body required. Idempotent: repeated calls preserve the original readAt. Returns the updated public inbox item. Unknown and other-account IDs both return 404.")
    public ApiResponse<Notification> read(Principal user,@PathVariable UUID id) { return ApiResponse.success(useCase.markRead(UUID.fromString(user.getName()),id),"Notification marked read"); }
}
