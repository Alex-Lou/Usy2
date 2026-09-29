package com.memocat.asset;

/**
 * Width and height of a stored image, read from its header only (no decoding),
 * so a photo's frame can take its real shape before it loads. JPEG sizes follow
 * the EXIF orientation, like browsers do (a portrait phone photo stays portrait).
 * Returns null when the header cannot be read: the frame then keeps a default shape.
 */
public record ImageDimensions(int width, int height) {

    public static ImageDimensions read(byte[] b) {
        try {
            ImageDimensions d = parse(b);
            return d != null && d.width > 0 && d.height > 0 ? d : null;
        } catch (IndexOutOfBoundsException e) {
            return null; // truncated header
        }
    }

    private static ImageDimensions parse(byte[] b) {
        if (b.length >= 24 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return new ImageDimensions(u32be(b, 16), u32be(b, 20));
        }
        if (b.length >= 10 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F') {
            return new ImageDimensions(u16le(b, 6), u16le(b, 8));
        }
        if (b.length >= 30 && b[0] == 'R' && b[1] == 'I' && b[8] == 'W' && b[9] == 'E') {
            return webp(b);
        }
        if (b.length >= 4 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8) {
            return jpeg(b);
        }
        return null;
    }

    private static ImageDimensions webp(byte[] b) {
        String chunk = new String(b, 12, 4, java.nio.charset.StandardCharsets.US_ASCII);
        return switch (chunk) {
            case "VP8 " -> new ImageDimensions(u16le(b, 26) & 0x3FFF, u16le(b, 28) & 0x3FFF);
            case "VP8L" -> {
                int bits = u16le(b, 21) | (u16le(b, 23) << 16);
                yield new ImageDimensions((bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1);
            }
            case "VP8X" -> new ImageDimensions(u24le(b, 24) + 1, u24le(b, 27) + 1);
            default -> null;
        };
    }

    private static ImageDimensions jpeg(byte[] b) {
        int orientation = 1;
        int i = 2;
        while (i + 4 <= b.length) {
            if ((b[i] & 0xFF) != 0xFF) {
                return null;
            }
            int marker = b[i + 1] & 0xFF;
            if (marker == 0xFF) { // fill byte
                i++;
                continue;
            }
            if (marker == 0xD8 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
                i += 2; // no length
                continue;
            }
            if (marker == 0xD9 || marker == 0xDA) {
                return null; // end of image / start of scan: no size found
            }
            int length = u16be(b, i + 2);
            int data = i + 4;
            if (marker == 0xE1 && length >= 8 && b[data] == 'E' && b[data + 1] == 'x' && b[data + 2] == 'i' && b[data + 3] == 'f') {
                orientation = exifOrientation(b, data + 6);
            }
            boolean sof = marker >= 0xC0 && marker <= 0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC;
            if (sof) {
                int height = u16be(b, data + 1);
                int width = u16be(b, data + 3);
                // 5–8: rotated a quarter turn, the displayed photo is the other way round.
                return orientation >= 5 && orientation <= 8 ? new ImageDimensions(height, width) : new ImageDimensions(width, height);
            }
            i += 2 + length;
        }
        return null;
    }

    /** The orientation tag (0x0112) of the first IFD of the TIFF block at {@code t}; 1 if absent. */
    private static int exifOrientation(byte[] b, int t) {
        boolean little = b[t] == 'I';
        int ifd = t + (little ? u32le(b, t + 4) : u32be(b, t + 4));
        int count = little ? u16le(b, ifd) : u16be(b, ifd);
        for (int n = 0; n < count; n++) {
            int e = ifd + 2 + n * 12;
            int tag = little ? u16le(b, e) : u16be(b, e);
            if (tag == 0x0112) {
                return little ? u16le(b, e + 8) : u16be(b, e + 8);
            }
        }
        return 1;
    }

    private static int u16be(byte[] b, int i) {
        return ((b[i] & 0xFF) << 8) | (b[i + 1] & 0xFF);
    }

    private static int u16le(byte[] b, int i) {
        return (b[i] & 0xFF) | ((b[i + 1] & 0xFF) << 8);
    }

    private static int u24le(byte[] b, int i) {
        return u16le(b, i) | ((b[i + 2] & 0xFF) << 16);
    }

    private static int u32be(byte[] b, int i) {
        return (u16be(b, i) << 16) | u16be(b, i + 2);
    }

    private static int u32le(byte[] b, int i) {
        return u16le(b, i) | (u16le(b, i + 2) << 16);
    }
}
