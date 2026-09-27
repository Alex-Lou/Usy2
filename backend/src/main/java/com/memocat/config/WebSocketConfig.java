package com.memocat.config;

import com.memocat.chat.LiveSockets;
import com.memocat.chat.StompAuthChannelInterceptor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor authInterceptor;
    private final CorsProperties corsProperties;
    private final TaskScheduler heartbeatScheduler;
    private final LiveSockets liveSockets;

    public WebSocketConfig(StompAuthChannelInterceptor authInterceptor, CorsProperties corsProperties,
                           @Lazy @Qualifier("messageBrokerTaskScheduler") TaskScheduler heartbeatScheduler,
                           LiveSockets liveSockets) {
        this.authInterceptor = authInterceptor;
        this.corsProperties = corsProperties;
        this.heartbeatScheduler = heartbeatScheduler;
        this.liveSockets = liveSockets;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(corsProperties.getAllowedOrigins().toArray(String[]::new));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Heartbeats: server pings every 10s and expects the client every 30s, so a
        // phone that vanished (no clean disconnect) is dropped within ~90s — it then
        // stops counting as "looking at the app" and gets push notifications again.
        registry.enableSimpleBroker("/topic")
                .setHeartbeatValue(new long[] {10_000, 30_000})
                .setTaskScheduler(heartbeatScheduler);
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.addDecoratorFactory(liveSockets);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }
}
