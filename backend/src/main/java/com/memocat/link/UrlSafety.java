package com.memocat.link;

import com.memocat.web.ContentValidationException;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;

/**
 * Guards the link-preview fetcher against SSRF: only http(s) on standard
 * ports, no credentials in the URL, and every address the host resolves to
 * must be a public one (no loopback, private, link-local / cloud metadata,
 * carrier-grade NAT, multicast or unique-local ranges). Checked again on
 * every redirect hop.
 */
@org.springframework.stereotype.Component
public class UrlSafety {

    static final int MAX_URL = 2048;

    /** Seam for tests: host name → addresses. */
    public interface Resolver {
        InetAddress[] resolve(String host) throws UnknownHostException;
    }

    private final Resolver resolver;

    public UrlSafety() {
        this(InetAddress::getAllByName);
    }

    UrlSafety(Resolver resolver) {
        this.resolver = resolver;
    }

    /** @return the parsed URI when it is safe to fetch; throws otherwise. */
    public URI check(String raw) {
        if (raw == null || raw.isBlank() || raw.length() > MAX_URL) {
            throw new ContentValidationException("Lien invalide");
        }
        URI uri;
        try {
            uri = URI.create(raw.strip());
        } catch (IllegalArgumentException e) {
            throw new ContentValidationException("Lien invalide");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw new ContentValidationException("Seuls les liens http(s) sont pris en charge");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank() || uri.getRawUserInfo() != null) {
            throw new ContentValidationException("Lien invalide");
        }
        int port = uri.getPort();
        if (port != -1 && port != 80 && port != 443) {
            throw new ContentValidationException("Port non autorisé");
        }
        String lower = host.toLowerCase(Locale.ROOT);
        if (lower.equals("localhost") || lower.endsWith(".localhost") || lower.endsWith(".local")
                || lower.endsWith(".internal")) {
            throw new ContentValidationException("Adresse non autorisée");
        }
        InetAddress[] addresses;
        try {
            addresses = resolver.resolve(host);
        } catch (UnknownHostException e) {
            throw new ContentValidationException("Site introuvable");
        }
        if (addresses.length == 0) {
            throw new ContentValidationException("Site introuvable");
        }
        for (InetAddress a : addresses) {
            if (!isPublic(a)) {
                throw new ContentValidationException("Adresse non autorisée");
            }
        }
        return uri;
    }

    static boolean isPublic(InetAddress a) {
        if (a.isAnyLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress()
                || a.isSiteLocalAddress() || a.isMulticastAddress()) {
            return false;
        }
        byte[] b = a.getAddress();
        if (a instanceof Inet4Address) {
            int b0 = b[0] & 0xFF;
            int b1 = b[1] & 0xFF;
            return !(b0 == 0                                  // 0.0.0.0/8
                    || (b0 == 100 && b1 >= 64 && b1 <= 127)   // 100.64.0.0/10 carrier-grade NAT
                    || (b0 == 192 && b1 == 0 && (b[2] & 0xFF) == 0) // 192.0.0.0/24
                    || (b0 == 198 && (b1 == 18 || b1 == 19))  // 198.18.0.0/15 benchmarking
                    || b0 >= 240);                            // reserved + broadcast
        }
        if (a instanceof Inet6Address) {
            int b0 = b[0] & 0xFF;
            return (b0 & 0xFE) != 0xFC; // fc00::/7 unique local
        }
        return false;
    }
}
