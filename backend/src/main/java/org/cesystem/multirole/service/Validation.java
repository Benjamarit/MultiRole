package org.cesystem.multirole.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class Validation {

    private Validation() {}

    /** ข้อความที่ห้ามว่าง และต้องไม่ยาวเกิน max */
    public static String requireText(String value, String message, int max) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return limit(value.trim(), message, max);
    }

    /** ข้อความที่ว่างได้ (คืน null ถ้าว่าง) แต่ต้องไม่ยาวเกิน max */
    public static String optionalText(String value, String fieldLabel, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return limit(value.trim(), fieldLabel, max);
    }

    private static String limit(String value, String label, int max) {
        if (value.length() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    label + " ยาวเกิน " + max + " ตัวอักษร");
        }
        return value;
    }
}