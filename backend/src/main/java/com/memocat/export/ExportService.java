package com.memocat.export;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * « Tout télécharger » : everything the two of us put in the app, as one ZIP.
 * {@code donnees/<table>.json} holds every row of every table (new tables are
 * picked up by themselves) and {@code fichiers/} every uploaded file (photos,
 * voice messages, documents) under its original name. Secrets never leave:
 * password hashes, notification keys and devices; the link-preview cache is
 * skipped too. Written straight to the response, one row and one file at a time.
 */
@Service
public class ExportService {

    /** Not our memories: keys, devices, the migration log, a cache; file bytes go to fichiers/. */
    static final Set<String> SKIPPED_TABLES = Set.of("vapid_key", "push_subscription", "flyway_schema_history",
            "link_preview", "asset_content");
    /** Columns left out of a table's rows. */
    static final Map<String, Set<String>> SKIPPED_COLUMNS = Map.of(
            "app_user", Set.of("password_hash", "tokens_valid_after"));

    private final JdbcTemplate jdbc;
    private final JsonFactory json = new JsonFactory();

    public ExportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void writeZip(OutputStream out) throws IOException {
        ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8);
        zip.putNextEntry(new ZipEntry("LISEZMOI.txt"));
        zip.write(README.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
        for (String table : tables()) {
            zip.putNextEntry(new ZipEntry("donnees/" + table + ".json"));
            writeTable(table, zip);
            zip.closeEntry();
        }
        writeFiles(zip);
        zip.finish();
    }

    List<String> tables() {
        return jdbc.queryForList("select table_name from information_schema.tables "
                        + "where table_schema = current_schema() and table_type = 'BASE TABLE' order by table_name",
                String.class).stream()
                .filter(t -> t.matches("[a-z0-9_]+") && !SKIPPED_TABLES.contains(t))
                .toList();
    }

    private void writeTable(String table, OutputStream out) throws IOException {
        Set<String> skipped = SKIPPED_COLUMNS.getOrDefault(table, Set.of());
        JsonGenerator gen = json.createGenerator(new NonClosing(out));
        gen.useDefaultPrettyPrinter();
        gen.writeStartArray();
        try {
            jdbc.query("select * from " + table, rs -> {
                try {
                    writeRow(rs, skipped, gen);
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
            });
        } catch (UncheckedIOException e) {
            throw e.getCause();
        }
        gen.writeEndArray();
        gen.close(); // flushes; the zip stays open (NonClosing)
    }

    private static void writeRow(ResultSet rs, Set<String> skipped, JsonGenerator gen) throws SQLException, IOException {
        ResultSetMetaData meta = rs.getMetaData();
        gen.writeStartObject();
        for (int i = 1; i <= meta.getColumnCount(); i++) {
            String column = meta.getColumnLabel(i);
            if (skipped.contains(column)) {
                continue;
            }
            Object value = rs.getObject(i);
            gen.writeFieldName(column);
            if (value == null) {
                gen.writeNull();
            } else if (value instanceof Number n) {
                gen.writeNumber(n.toString());
            } else if (value instanceof Boolean b) {
                gen.writeBoolean(b);
            } else if (value instanceof java.sql.Timestamp t) {
                gen.writeString(t.toInstant().toString());
            } else if (value instanceof byte[] bytes) {
                gen.writeBinary(bytes);
            } else {
                gen.writeString(value.toString()); // text, dates, times, json, arrays
            }
        }
        gen.writeEndObject();
    }

    private void writeFiles(ZipOutputStream zip) throws IOException {
        List<Map<String, Object>> assets = jdbc.queryForList("select id, original_filename from asset order by id");
        for (Map<String, Object> a : assets) {
            long id = ((Number) a.get("id")).longValue();
            byte[] bytes = jdbc.query("select bytes from asset_content where asset_id = ?",
                    rs -> rs.next() ? rs.getBytes(1) : null, id);
            if (bytes == null) {
                continue;
            }
            zip.putNextEntry(new ZipEntry("fichiers/" + id + "-" + safe(String.valueOf(a.get("original_filename")))));
            zip.write(bytes);
            zip.closeEntry();
        }
    }

    /** A file name that stays inside its folder of the ZIP. */
    static String safe(String name) {
        String cleaned = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").replaceAll("^\\.+", "").strip();
        return cleaned.isEmpty() ? "fichier" : cleaned;
    }

    private static final String README = """
            MemoCat — nos souvenirs
            ========================

            donnees/  Tout ce qu'on a mis dans l'appli, une table par fichier JSON :
                      messages (message), posts (post), commentaires (comment), mots (couple_note),
                      humeurs (mood), listes (shared_list, shared_list_item), dates (couple_event),
                      albums et photos (album, photo), profils (profile), jeux, Nous deux, Moka…
                      Les dates sont en UTC (format ISO 8601).
            fichiers/ Toutes les photos, notes vocales et documents envoyés, sous leur nom
                      d'origine, précédé de leur numéro (le « id » de la table asset).

            Pas dedans : les mots de passe et les clés des notifications.
            """;

    /** Lets a JSON writer finish without closing the ZIP underneath. */
    private static final class NonClosing extends java.io.FilterOutputStream {
        NonClosing(OutputStream out) {
            super(out);
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            out.write(b, off, len);
        }

        @Override
        public void close() throws IOException {
            flush();
        }
    }
}
