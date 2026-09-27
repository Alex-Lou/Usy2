package com.memocat.asset;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores a {@link Framing} as its short text form ("x,y,zoom"). */
@Converter
public class FramingConverter implements AttributeConverter<Framing, String> {

    @Override
    public String convertToDatabaseColumn(Framing framing) {
        return framing == null ? null : framing.format();
    }

    @Override
    public Framing convertToEntityAttribute(String stored) {
        return Framing.parse(stored);
    }
}
