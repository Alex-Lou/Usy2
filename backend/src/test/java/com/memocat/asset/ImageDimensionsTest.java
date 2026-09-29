package com.memocat.asset;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class ImageDimensionsTest {

    private static byte[] encode(String format, int w, int h) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB), format, out);
        return out.toByteArray();
    }

    /** The JPEG with an EXIF block (big- or little-endian) carrying this orientation, right after SOI. */
    private static byte[] withOrientation(byte[] jpeg, int orientation, boolean little) {
        byte[] tiff = little
                ? new byte[] {'I', 'I', 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, (byte) orientation, 0, 0, 0, 0, 0, 0, 0, 0, 0}
                : new byte[] {'M', 'M', 0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, (byte) orientation, 0, 0, 0, 0, 0, 0, 0, 0};
        int len = 2 + 6 + tiff.length;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(jpeg, 0, 2);
        out.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xE1, (byte) (len >> 8), (byte) len, 'E', 'x', 'i', 'f', 0, 0});
        out.writeBytes(tiff);
        out.write(jpeg, 2, jpeg.length - 2);
        return out.toByteArray();
    }

    @Test
    void readsPngGifAndJpeg() throws IOException {
        assertThat(ImageDimensions.read(encode("png", 300, 200))).isEqualTo(new ImageDimensions(300, 200));
        assertThat(ImageDimensions.read(encode("gif", 40, 70))).isEqualTo(new ImageDimensions(40, 70));
        assertThat(ImageDimensions.read(encode("jpg", 640, 480))).isEqualTo(new ImageDimensions(640, 480));
    }

    @Test
    void aQuarterTurnedJpegIsTheOtherWayRound() throws IOException {
        byte[] jpeg = encode("jpg", 640, 480);
        assertThat(ImageDimensions.read(withOrientation(jpeg, 6, false))).isEqualTo(new ImageDimensions(480, 640));
        assertThat(ImageDimensions.read(withOrientation(jpeg, 8, true))).isEqualTo(new ImageDimensions(480, 640));
        assertThat(ImageDimensions.read(withOrientation(jpeg, 3, true))).isEqualTo(new ImageDimensions(640, 480));
    }

    @Test
    void readsTheThreeWebpKinds() {
        byte[] lossy = riff("VP8 ");
        lossy[23] = (byte) 0x9D; lossy[24] = 0x01; lossy[25] = 0x2A;
        lossy[26] = (byte) 0x90; lossy[27] = 0x01; // 400
        lossy[28] = 0x2C; lossy[29] = 0x01;        // 300
        assertThat(ImageDimensions.read(lossy)).isEqualTo(new ImageDimensions(400, 300));

        byte[] lossless = riff("VP8L");
        int bits = (400 - 1) | ((300 - 1) << 14);
        lossless[20] = 0x2F;
        for (int k = 0; k < 4; k++) lossless[21 + k] = (byte) (bits >> (8 * k));
        assertThat(ImageDimensions.read(lossless)).isEqualTo(new ImageDimensions(400, 300));

        byte[] extended = riff("VP8X");
        extended[24] = (byte) 0x8F; extended[25] = 0x01; // 399
        extended[27] = 0x2B; extended[28] = 0x01;        // 299
        assertThat(ImageDimensions.read(extended)).isEqualTo(new ImageDimensions(400, 300));
    }

    private static byte[] riff(String chunk) {
        byte[] b = new byte[32];
        System.arraycopy("RIFF".getBytes(), 0, b, 0, 4);
        System.arraycopy("WEBP".getBytes(), 0, b, 8, 4);
        System.arraycopy(chunk.getBytes(), 0, b, 12, 4);
        return b;
    }

    @Test
    void unreadableHeadersGiveNothing() throws IOException {
        assertThat(ImageDimensions.read(new byte[0])).isNull();
        assertThat(ImageDimensions.read(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0})).isNull();
        byte[] png = encode("png", 10, 10);
        assertThat(ImageDimensions.read(java.util.Arrays.copyOf(png, 20))).isNull();
        assertThat(ImageDimensions.read("%PDF-1.4 hello world, not an image".getBytes())).isNull();
    }
}
