package org.cesystem.multirole.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * ตอบ error เป็นข้อความล้วน (text/plain) เหมือน AuthController เดิมที่ใช้ body(e.getMessage())
 * ถ้าไม่มีคลาสนี้ Spring Boot จะซ่อนข้อความจาก ResponseStatusException (เว้นแต่ตั้ง server.error.include-message=always)
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<String> handleStatus(ResponseStatusException ex) {
        return text(HttpStatus.valueOf(ex.getStatusCode().value()),
                ex.getReason() != null ? ex.getReason() : "เกิดข้อผิดพลาด");
    }

    /** JSON พัง หรือชนิดข้อมูลผิด เช่น UUID ไม่ถูกรูปแบบ */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<String> handleUnreadable(HttpMessageNotReadableException ex) {
        return text(HttpStatus.BAD_REQUEST, "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง");
    }

    /** ชน unique / FK ที่ controller ไม่ได้ดักไว้เอง */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<String> handleIntegrity(DataIntegrityViolationException ex) {
        return text(HttpStatus.CONFLICT, "ข้อมูลซ้ำกับที่มีอยู่ หรือถูกข้อมูลอื่นอ้างอิงอยู่");
    }

    private static ResponseEntity<String> text(HttpStatus status, String message) {
        return ResponseEntity.status(status).contentType(MediaType.TEXT_PLAIN).body(message);
    }
}